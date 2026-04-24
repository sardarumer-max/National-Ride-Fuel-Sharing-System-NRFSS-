const bcrypt = require("bcrypt");
const { z } = require("zod");
const supabase = require("../utils/db");
const redis = require("../utils/redis");
const { HttpError } = require("../utils/http");
const { signAccessToken, signRefreshToken, verifyRefreshToken, REFRESH_EXPIRES_SECONDS } = require("../utils/tokens");

const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;

const registerSchema = z.object({
  full_name: z.string().min(3),
  cnic: z.string().regex(cnicRegex, "Invalid CNIC format"),
  mobile: z.string().min(8),
  email: z.string().email(),
  age: z.coerce.number().int().min(18),
  city: z.string().min(2),
  profession: z.string().min(2),
  password: z.string().min(8),
  role: z.enum(["user", "driver", "admin"]).optional(),
  vehicle: z
    .object({
      type: z.enum(["bike", "car", "van"]),
      fuel_type: z.enum(["petrol", "cng", "diesel"]),
      fuel_efficiency: z.coerce.number().positive(),
      seats: z.coerce.number().int().min(1).max(12),
    })
    .optional(),
});

const loginSchema = z.object({
  credential: z.string().min(3),
  password: z.string().min(8),
});

const setRefreshCookie = (res, token) => {
  res.cookie("refreshToken", token, {
    httpOnly: true,
    sameSite: "strict",
    secure: false,
    maxAge: REFRESH_EXPIRES_SECONDS * 1000,
  });
};

const register = async (req, res) => {
  const payload = registerSchema.parse(req.body);
  const password_hash = await bcrypt.hash(payload.password, 12);

  const { data: user, error } = await supabase
    .from("users")
    .insert({
      full_name: payload.full_name,
      cnic: payload.cnic,
      mobile: payload.mobile,
      email: payload.email,
      age: payload.age,
      city: payload.city,
      profession: payload.profession,
      password_hash,
      role: payload.role || "user",
    })
    .select("id,full_name,email,mobile,cnic,role,is_verified,city,profession,age")
    .single();

  if (error) throw new HttpError(400, error.message);

  if (payload.vehicle) {
    await supabase.from("vehicles").insert({ user_id: user.id, ...payload.vehicle });
  }

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });
  await redis.set(`refresh:${user.id}`, refreshToken, { ex: REFRESH_EXPIRES_SECONDS });
  setRefreshCookie(res, refreshToken);
  return res.status(201).json({ user, accessToken });
};

const login = async (req, res) => {
  const payload = loginSchema.parse(req.body);

  const { data: user, error } = await supabase
    .from("users")
    .select("id,full_name,email,mobile,password_hash,role,is_verified")
    .or(`email.eq.${payload.credential},mobile.eq.${payload.credential}`)
    .maybeSingle();

  if (error || !user) throw new HttpError(401, "Invalid credentials");

  const valid = await bcrypt.compare(payload.password, user.password_hash);
  if (!valid) throw new HttpError(401, "Invalid credentials");

  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const refreshToken = signRefreshToken({ sub: user.id, role: user.role });
  await redis.set(`refresh:${user.id}`, refreshToken, { ex: REFRESH_EXPIRES_SECONDS });
  setRefreshCookie(res, refreshToken);

  return res.json({
    user: {
      id: user.id,
      full_name: user.full_name,
      email: user.email,
      mobile: user.mobile,
      role: user.role,
      is_verified: user.is_verified,
    },
    accessToken,
  });
};

const refresh = async (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) throw new HttpError(401, "Missing refresh token");

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch (_err) {
    throw new HttpError(401, "Invalid refresh token");
  }

  const stored = await redis.get(`refresh:${decoded.sub}`);
  if (!stored || stored !== token) throw new HttpError(401, "Refresh token mismatch");

  const accessToken = signAccessToken({ sub: decoded.sub, role: decoded.role });
  const newRefreshToken = signRefreshToken({ sub: decoded.sub, role: decoded.role });
  await redis.set(`refresh:${decoded.sub}`, newRefreshToken, { ex: REFRESH_EXPIRES_SECONDS });
  setRefreshCookie(res, newRefreshToken);
  return res.json({ accessToken });
};

module.exports = { register, login, refresh };
