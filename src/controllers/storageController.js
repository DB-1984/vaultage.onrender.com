import supabaseAdmin from "../utils/supabaseAdmin.js";

export const storageHealth = async (req, res) => {
  const { data, error } = await supabaseAdmin.storage
    .from(process.env.SUPABASE_BUCKET)
    .list("", { limit: 1 });

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  res.json({
    ok: true,
    bucket: process.env.SUPABASE_BUCKET,
    sample: data,
  });
};
