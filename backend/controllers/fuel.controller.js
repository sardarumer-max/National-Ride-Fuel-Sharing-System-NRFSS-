const { z } = require("zod");
const supabase = require("../utils/db");

const schema = z.object({
  ride_id: z.string().uuid().optional(),
  distance_km: z.coerce.number().positive(),
  fuel_efficiency: z.coerce.number().positive(),
  fuel_price: z.coerce.number().positive(),
  passengers_count: z.coerce.number().int().min(1),
});

const calculateFuel = async (req, res) => {
  const payload = schema.parse(req.query);
  const fuel_consumed_liters = Number((payload.distance_km / payload.fuel_efficiency).toFixed(2));
  const total_fuel_cost = Number((fuel_consumed_liters * payload.fuel_price).toFixed(2));
  const cost_per_passenger = Number((total_fuel_cost / payload.passengers_count).toFixed(2));

  if (payload.ride_id) {
    await supabase.from("fuel_splits").insert({
      ride_id: payload.ride_id,
      total_fuel_cost,
      passengers_count: payload.passengers_count,
      cost_per_passenger,
      fuel_consumed_liters,
    });
  }

  return res.json({ fuel_consumed_liters, total_fuel_cost, cost_per_passenger });
};

module.exports = { calculateFuel };
