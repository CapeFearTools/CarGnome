import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { getServiceRoleClient } from "@workspace/supabase-client";
import { CreateLeadBody, CreateLeadResponse } from "@workspace/api-zod";
import { rateLimit } from "../middlewares/rate-limit";

const router: IRouter = Router();

const MAX_LENGTH = { name: 120, email: 254, phone: 40, message: 2000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Each visitor (by IP) can send a limited number of leads, to blunt form spam.
const leadRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  message: "Too many requests. Please try again in a few minutes.",
});

interface LeadFields {
  vin: string | null;
  lead_type: "inquiry" | "click_for_price";
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
}

/** Trims a text field; blank becomes null. */
function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/** Returns a message for the visitor when the lead can't be accepted. */
function validateLead(lead: LeadFields): string | null {
  if (lead.name && lead.name.length > MAX_LENGTH.name) return "Name is too long.";
  if (lead.email && lead.email.length > MAX_LENGTH.email) return "Email is too long.";
  if (lead.phone && lead.phone.length > MAX_LENGTH.phone) return "Phone number is too long.";
  if (lead.message && lead.message.length > MAX_LENGTH.message) {
    return `Message must be ${MAX_LENGTH.message.toLocaleString()} characters or fewer.`;
  }
  if (lead.email && !EMAIL_PATTERN.test(lead.email)) return "Enter a valid email address.";

  // An inquiry asks the dealer to follow up, so it needs a way to reach the shopper.
  if (lead.lead_type === "inquiry") {
    if (!lead.name) return "Name is required.";
    if (!lead.email) return "Email is required.";
    if (!lead.phone || lead.phone.replace(/\D/g, "").length < 10) {
      return "Enter a valid phone number.";
    }
  }

  return null;
}

// POST /leads
router.post("/leads", leadRateLimit, async (req, res): Promise<void> => {
  const parsed = CreateLeadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const lead: LeadFields = {
    vin: clean(parsed.data.vin),
    lead_type: parsed.data.lead_type,
    name: clean(parsed.data.name),
    email: clean(parsed.data.email),
    phone: clean(parsed.data.phone),
    message: clean(parsed.data.message),
  };

  // Honeypot: the form hides this field from people, so a value means a bot.
  // Answer as if it worked so the bot moves on, but store nothing.
  if (clean(parsed.data.website)) {
    req.log.info("Discarded lead with the honeypot field filled in");
    res.status(201).json(CreateLeadResponse.parse({ id: randomUUID(), lead_type: lead.lead_type }));
    return;
  }

  const validationError = validateLead(lead);
  if (validationError) {
    res.status(400).json({ error: validationError });
    return;
  }

  const client = getServiceRoleClient();

  // Link the lead to its listing from our own records instead of trusting
  // IDs or links sent by the browser.
  let listingId: string | null = null;
  let vehicleDetailLink: string | null = null;
  if (lead.vin) {
    const { data: listing, error: listingError } = await client
      .from("listings")
      .select("id, vehicle_detail_link")
      .eq("vin", lead.vin)
      .maybeSingle();

    if (listingError) {
      req.log.warn({ err: listingError }, "Failed to look up listing for lead");
    } else if (listing) {
      listingId = listing.id;
      vehicleDetailLink = listing.vehicle_detail_link;
    }
  }

  const { data, error } = await client
    .from("leads")
    .insert({ ...lead, listing_id: listingId, vehicle_detail_link: vehicleDetailLink })
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
