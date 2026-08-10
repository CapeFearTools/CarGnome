import { Router, type IRouter } from "express";
import { getServiceRoleClient } from "@workspace/supabase-client";
import { CreateLeadBody, CreateLeadResponse } from "@workspace/api-zod";

const router: IRouter = Router();

// POST /leads
router.post("/leads", async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const client = getServiceRoleClient();
  const { data, error } = await client
    .from("leads")
    .insert({
      vin: parsed.data.vin ?? null,
      listing_id: parsed.data.listing_id ?? null,
      lead_type: parsed.data.lead_type,
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      message: parsed.data.message ?? null,
      vehicle_detail_link: parsed.data.vehicle_detail_link ?? null,
    })
    .select()
    .single();

  if (error || !data) {
    req.log.error({ err: error }, "Failed to create lead");
    res.status(500).json({ error: "Failed to create lead" });
    return;
  }

  res.status(201).json(CreateLeadResponse.parse(data));
});

export default router;
