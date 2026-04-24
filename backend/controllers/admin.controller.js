const supabase = require("../utils/db");
const { HttpError } = require("../utils/http");

const verifyUser = async (req, res) => {
  const { userId } = req.params;
  const { data, error } = await supabase.from("users").update({ is_verified: true }).eq("id", userId).select("*").single();
  if (error) throw new HttpError(400, error.message);
  await supabase.from("notifications").insert({
    user_id: userId,
    type: "verification",
    message: "Your account has been verified by admin",
    is_read: false,
  });
  return res.json(data);
};

const getStats = async (_req, res) => {
  const [{ count: users }, { count: rides }, { count: requests }] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("rides").select("*", { count: "exact", head: true }),
    supabase.from("ride_requests").select("*", { count: "exact", head: true }),
  ]);
  return res.json({
    users: users || 0,
    rides: rides || 0,
    ride_requests: requests || 0,
  });
};

module.exports = { verifyUser, getStats };
