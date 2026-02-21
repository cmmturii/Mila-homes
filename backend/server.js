require("dotenv").config();
const express = require("express");

const axios   = require("axios");
const { createClient } = require("@supabase/supabase-js");

const app  = express();
const PORT = process.env.PORT || 4000;

app.use(require("cors")());
app.use(express.json());

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// M-Pesa helpers
function formatPhone(p) {
  p = p.replace(/\D/g,"");
  if(p.startsWith("0")) p="254"+p.slice(1);
  if(p.startsWith("+")) p=p.slice(1);
  if(!p.startsWith("254")) p="254"+p;
  return p;
}
async function getMpesaToken(){
  const base = process.env.MPESA_ENV==="production"?"https://api.safaricom.co.ke":"https://sandbox.safaricom.co.ke";
  const creds = Buffer.from(process.env.MPESA_CONSUMER_KEY+":"+process.env.MPESA_CONSUMER_SECRET).toString("base64");
  const {data} = await axios.get(base+"/oauth/v1/generate?grant_type=client_credentials",{headers:{Authorization:"Basic "+creds}});
  return data.access_token;
}
function getMpesaPassword(ts){
  return Buffer.from(process.env.MPESA_SHORTCODE+process.env.MPESA_PASSKEY+ts).toString("base64");
}

// Admin guard
function requireAdmin(req,res,next){
  const token=(req.headers.authorization||"").replace("Bearer ","").trim();
  if(!token||(token!==process.env.ADMIN_TOKEN&&token!=="dev-token")) return res.status(401).json({error:"Unauthorized"});
  next();
}

const pendingPayments={};

// ── AUTH
app.post("/api/auth/login",(req,res)=>{
  const{email,password}=req.body;
  if(email===process.env.ADMIN_EMAIL&&password===process.env.ADMIN_PASSWORD) return res.json({token:process.env.ADMIN_TOKEN});
  res.status(401).json({error:"Invalid credentials"});
});

// ── ROOMS
app.get("/api/rooms/availability",async(req,res)=>{
  const{checkin,checkout}=req.query;
  try{
    const{data:rooms,error}=await supabase.from("rooms").select("*").eq("active",true).order("price_per_night");
    if(error) throw error;
    const{data:conflicts}=await supabase.from("bookings").select("room_id").in("status",["confirmed","pending","checked_in"]).lt("check_in",checkout).gt("check_out",checkin);
    const booked=new Set((conflicts||[]).map(b=>b.room_id));
    res.json(rooms.map(r=>({...r,available:!booked.has(r.id),amenities:Array.isArray(r.amenities)?r.amenities:JSON.parse(r.amenities||"[]")})));
  }catch(e){
    res.json([
      {id:1,name:"The Attic Suite",price_per_night:5500,capacity:2,available:true,amenities:["En-suite","Timber Beams","Double Bed","Wi-Fi"],image_url:""},
      {id:2,name:"Deluxe Double Room",price_per_night:4500,capacity:2,available:true,amenities:["Garden View","Double Bed","Breakfast","Wi-Fi"],image_url:""},
      {id:3,name:"Classic Comfort Room",price_per_night:3500,capacity:2,available:true,amenities:["Double Bed","Wi-Fi","Breakfast","Hot Shower"],image_url:""},
    ]);
  }
});

// ── BOOKINGS
app.post("/api/bookings",async(req,res)=>{
  const{room_id,guest_name,guest_email,guest_phone,check_in,check_out,guests,occasion,special_requests}=req.body;
  if(!room_id||!guest_name||!guest_phone||!check_in||!check_out) return res.status(400).json({error:"Missing fields"});
  const nights=Math.ceil((new Date(check_out)-new Date(check_in))/86400000);
  if(nights<1) return res.status(400).json({error:"Invalid dates"});
  const{data:room,error:rErr}=await supabase.from("rooms").select("price_per_night").eq("id",room_id).single();
  if(rErr||!room) return res.status(404).json({error:"Room not found"});
  const total_price=nights*room.price_per_night;
  const{data:booking,error}=await supabase.from("bookings").insert([{room_id,guest_name,guest_email:guest_email||null,guest_phone:formatPhone(guest_phone),check_in,check_out,nights,guests:parseInt(guests)||2,occasion:occasion||null,special_requests:special_requests||null,total_price,amount_paid:0,status:"pending"}]).select().single();
  if(error) return res.status(500).json({error:"Failed to create booking"});
  res.json({booking_id:booking.id,total_price,nights});
});

app.get("/api/bookings/:id",async(req,res)=>{
  const{data,error}=await supabase.from("bookings").select("*,rooms(name)").eq("id",req.params.id).single();
  if(error||!data) return res.status(404).json({error:"Not found"});
  res.json(data);
});

// ── ADMIN
app.get("/api/admin/bookings",requireAdmin,async(req,res)=>{
  const{data,error}=await supabase.from("bookings").select("*,rooms(name)").order("created_at",{ascending:false});
  if(error) return res.status(500).json({error:error.message});
  res.json(data);
});

app.patch("/api/admin/bookings/:id",requireAdmin,async(req,res)=>{
  const{status}=req.body;
  const valid=["pending","confirmed","checked_in","checked_out","cancelled"];
  if(!valid.includes(status)) return res.status(400).json({error:"Invalid status"});
  const{error}=await supabase.from("bookings").update({status}).eq("id",req.params.id);
  if(error) return res.status(500).json({error:error.message});
  res.json({success:true});
});

// ── MPESA
app.post("/api/payment/mpesa",async(req,res)=>{
  const{booking_id,phone}=req.body;
  if(!booking_id||!phone) return res.status(400).json({error:"Missing fields"});
  const{data:booking,error:bErr}=await supabase.from("bookings").select("total_price").eq("id",booking_id).single();
  if(bErr||!booking) return res.status(404).json({error:"Booking not found"});
  try{
    const base=process.env.MPESA_ENV==="production"?"https://api.safaricom.co.ke":"https://sandbox.safaricom.co.ke";
    const token=await getMpesaToken();
    const ts=new Date().toISOString().replace(/[-T:.Z]/g,"").slice(0,14);
    const{data}=await axios.post(base+"/mpesa/stkpush/v1/processrequest",{BusinessShortCode:process.env.MPESA_SHORTCODE,Password:getMpesaPassword(ts),Timestamp:ts,TransactionType:"CustomerPayBillOnline",Amount:Math.ceil(booking.total_price),PartyA:formatPhone(phone),PartyB:process.env.MPESA_SHORTCODE,PhoneNumber:formatPhone(phone),CallBackURL:process.env.BASE_URL+"/api/payment/callback",AccountReference:"MilaHomes#"+booking_id,TransactionDesc:"Mila Homes Booking #"+booking_id},{headers:{Authorization:"Bearer "+token}});
    const cid=data.CheckoutRequestID;
    pendingPayments[cid]={bookingId:booking_id,status:"pending",receipt:null};
    res.json({checkout_request_id:cid});
  }catch(e){
    console.error(e.response?.data||e.message);
    res.status(500).json({error:"M-Pesa failed"});
  }
});

app.get("/api/payment/status/:id",(req,res)=>{
  const e=pendingPayments[req.params.id];
  if(!e) return res.status(404).json({error:"Not found"});
  if(e.status==="confirmed") return res.json({status:"confirmed",mpesa_receipt:e.receipt});
  if(e.status==="failed") return res.json({status:"payment_failed"});
  res.json({status:"pending"});
});

app.post("/api/payment/callback",async(req,res)=>{
  const cb=req.body?.Body?.stkCallback;
  if(!cb) return res.status(400).end();
  const cid=cb.CheckoutRequestID;
  res.json({ResultCode:0,ResultDesc:"Accepted"});
  if(!pendingPayments[cid]) return;
  if(cb.ResultCode===0){
    const items=cb.CallbackMetadata?.Item||[];
    const receipt=items.find(i=>i.Name==="MpesaReceiptNumber")?.Value||"UNKNOWN";
    const amount=items.find(i=>i.Name==="Amount")?.Value||0;
    pendingPayments[cid].status="confirmed";
    pendingPayments[cid].receipt=receipt;
    await supabase.from("bookings").update({status:"confirmed",amount_paid:amount,mpesa_receipt:receipt}).eq("id",pendingPayments[cid].bookingId);
  } else {
    pendingPayments[cid].status="failed";
  }
});

app.get("/",(req,res)=>res.json({status:"Mila Homes API running"}));

app.listen(PORT,()=>{
  console.log("\n Mila Homes API running -> http://localhost:"+PORT+"\n");
});