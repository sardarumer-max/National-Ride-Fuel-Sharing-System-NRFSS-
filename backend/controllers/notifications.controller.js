const supabase = require("../utils/db");

const getNotifications = async (req, res) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", req.user.sub)
    .order("id", { ascending: false })
    .limit(100);
  if (error) throw error;
  return res.json(data);
};

module.exports = { getNotifications };
