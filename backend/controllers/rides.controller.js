const { z } = require("zod");
const supabase = require("../utils/db");
const redis = require("../utils/redis");
const { HttpError } = require("../utils/http");

const postRideSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  stops: z.array(z.string()).default([]),
  date: z.string(),
  departure_time: z.string(),
  available_seats: z.coerce.number().int().min(1),
  fare_per_seat: z.coerce.number().nonnegative(),
  fuel_type: z.enum(["petrol", "cng", "diesel"]),
  total_distance: z.coerce.number().nonnegative(),
  status: z.string().default("open"),
});

const matchSchema = z.object({
  origin: z.string().min(2),
  destination: z.string().min(2),
  date: z.string().optional(),
  seats: z.coerce.number().int().min(1).optional(),
});

const postRide = async (req, res) => {
  const payload = postRideSchema.parse(req.body);
  const { data, error } = await supabase
    .from("rides")
    .insert({ ...payload, driver_id: req.user.sub })
    .select("*")
    .single();
  if (error) throw new HttpError(400, error.message);
  return res.status(201).json(data);
};

const matchRides = async (req, res) => {
  const query = matchSchema.parse(req.query);
  const cacheKey = `ride-match:${query.origin}:${query.destination}:${query.date || "any"}:${query.seats || "any"}`;
  const cached = await redis.get(cacheKey);
  if (cached) return res.json({ source: "cache", rides: cached });

  let q = supabase
    .from("rides")
    .select("*, users!rides_driver_id_fkey(full_name,is_verified)")
    .ilike("origin", `%${query.origin}%`)
    .ilike("destination", `%${query.destination}%`)
    .gte("available_seats", query.seats || 1)
    .eq("status", "open");

  if (query.date) q = q.eq("date", query.date);
  const { data, error } = await q.order("date", { ascending: true });
  if (error) throw new HttpError(400, error.message);
  await redis.set(cacheKey, data, { ex: 300 });
  return res.json({ source: "db", rides: data });
};

const requestRide = async (req, res) => {
  const rideId = req.params.id;
  const { data, error } = await supabase
    .from("ride_requests")
    .insert({ ride_id: rideId, passenger_id: req.user.sub, status: "pending" })
    .select("*")
    .single();
  if (error) throw new HttpError(400, error.message);
  await redis.publish("notifications", JSON.stringify({ type: "ride_request", rideId, passengerId: req.user.sub }));
  return res.status(201).json(data);
};

const updateRideRequest = async (req, res) => {
  const schema = z.object({ status: z.enum(["accepted", "rejected"]) });
  const { status } = schema.parse(req.body);
  const { id } = req.params;

  const { data: existing, error: existingErr } = await supabase.from("ride_requests").select("*").eq("id", id).single();
  if (existingErr || !existing) throw new HttpError(404, "Ride request not found");

  const { data: ride } = await supabase.from("rides").select("driver_id").eq("id", existing.ride_id).single();
  if (!ride || ride.driver_id !== req.user.sub) throw new HttpError(403, "Only driver can update requests");

  const { data, error } = await supabase
    .from("ride_requests")
    .update({ status })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw new HttpError(400, error.message);

  await supabase.from("notifications").insert({
    user_id: existing.passenger_id,
    type: "ride_request_update",
    message: `Your request has been ${status}`,
    is_read: false,
  });

  await redis.publish("notifications", JSON.stringify({ type: "ride_request_update", requestId: id, status }));
  return res.json(data);
};

module.exports = { postRide, matchRides, requestRide, updateRideRequest };
