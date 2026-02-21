const supabase      = require("../config/db");
const { formatPhone } = require("../config/mpesa");

/**
 * POST /api/bookings
 * Creates a new booking in Supabase, returns booking_id + total_price
 */
async function createBooking(req, res) {
  const {
    room_id, guest_name, guest_email, guest_phone,
    check_in, check_out, guests, occasion, special_requests,
  } = req.body;

  // Validation
  if (!room_id || !guest_name || !guest_phone || !check_in || !check_out) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const nights = Math.ceil(
    (new Date(check_out) - new Date(check_in)) / (1000 * 60 * 60 * 24)
  );
  if (nights < 1) return res.status(400).json({ error: "Invalid dates" });

  // Fetch room to get price
  const { data: room, error: roomErr } = await supabase
    .from("rooms")
    .select("price_per_night, name")
    .eq("id", room_id)
    .single();

  if (roomErr || !room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const total_price = nights * room.price_per_night;

  // Insert booking
  const { data: booking, error } = await supabase
    .from("bookings")
    .insert([{
      room_id,
      guest_name,
      guest_email:      guest_email || null,
      guest_phone:      formatPhone(guest_phone),
      check_in,
      check_out,
      nights,
      guests:           parseInt(guests) || 2,
      occasion:         occasion || null,
      special_requests: special_requests || null,
      total_price,
      amount_paid:      0,
      status:           "pending",
    }])
    .select()
    .single();

  if (error) {
    console.error("Booking insert error:", error);
    return res.status(500).json({ error: "Failed to create booking" });
  }

  res.json({ booking_id: booking.id, total_price, nights });
}

/**
 * GET /api/bookings/:id
 * Returns a single booking — used by confirm.html to display receipt details
 */
async function getBooking(req, res) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, rooms(name)")
    .eq("id", req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: "Booking not found" });
  res.json(data);
}

/**
 * GET /api/admin/bookings
 * Returns all bookings for the admin dashboard
 */
async function getAllBookings(req, res) {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, rooms(name)")
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
}

/**
 * PATCH /api/admin/bookings/:id
 * Updates booking status (confirm, check-in, cancel, etc.)
 */
async function updateBookingStatus(req, res) {
  const { status } = req.body;
  const validStatuses = ["pending", "confirmed", "checked_in", "checked_out", "cancelled"];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: "Invalid status value" });
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status })
    .eq("id", req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
}

module.exports = { createBooking, getBooking, getAllBookings, updateBookingStatus };
