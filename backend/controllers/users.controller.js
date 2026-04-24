const { z } = require("zod");
const supabase = require("../utils/db");
const { HttpError } = require("../utils/http");

const updateSchema = z.object({
  full_name: z.string().min(3).optional(),
  age: z.coerce.number().int().min(18).optional(),
  city: z.string().min(2).optional(),
  profession: z.string().min(2).optional(),
  mobile: z.string().min(8).optional(),
  email: z.string().email().optional(),
});

const getUser = async (req, res) => {
  if (req.user.sub !== req.params.id && req.user.role !== "admin") {
    throw new HttpError(403, "Forbidden");
  }
  const { data, error } = await supabase
    .from("users")
    .select("id,full_name,cnic,mobile,email,age,city,profession,is_verified,role,created_at")
    .eq("id", req.params.id)
    .single();
  if (error) throw new HttpError(404, "User not found");
  return res.json(data);
};

const updateUser = async (req, res) => {
  if (req.user.sub !== req.params.id && req.user.role !== "admin") {
    throw new HttpError(403, "Forbidden");
  }
  const payload = updateSchema.parse(req.body);
  const { data, error } = await supabase.from("users").update(payload).eq("id", req.params.id).select("*").single();
  if (error) throw new HttpError(400, error.message);
  return res.json(data);
};

const getDashboard = async (req, res) => {
  if (req.user.sub !== req.params.id && req.user.role !== "admin") {
    throw new HttpError(403, "Forbidden");
  }

  const userId = req.params.id;
  const [ridesAsDriver, ridesAsPassenger, matches] = await Promise.all([
    supabase.from("rides").select("*").eq("driver_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase
      .from("ride_requests")
      .select("id,status,created_at,rides(id,origin,destination,date,departure_time,fare_per_seat,status)")
      .eq("passenger_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("rides")
      .select("id,origin,destination,date,departure_time,available_seats,fare_per_seat,status,users!rides_driver_id_fkey(full_name)")
      .eq("status", "open")
      .neq("driver_id", userId)
      .limit(10),
  ]);

  return res.json({
    stats: {
      rides_as_driver: ridesAsDriver.data?.length || 0,
      rides_as_passenger: ridesAsPassenger.data?.length || 0,
      open_matches: matches.data?.length || 0,
    },
    ride_history: {
      as_driver: ridesAsDriver.data || [],
      as_passenger: ridesAsPassenger.data || [],
    },
    matched_rides: matches.data || [],
  });
};

module.exports = { getUser, updateUser, getDashboard };
