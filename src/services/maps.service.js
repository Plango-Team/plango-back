const axios = require("axios");
const { config } = require("../config");
const AppError = require("../utils/appError");

exports.getDetailedRoute = async (origin, destination, mode = "driving") => {
  try {
    const originStr = `${origin[1]},${origin[0]}`;
    const destStr = `${destination[1]},${destination[0]}`;

    const googleModes = {
      car: "driving",
      walking: "walking",
      biking: "bicycling",
      transit: "transit",
      other: "driving",
    };
    const googleMode = googleModes[mode] || "driving";

    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/directions/json",
      {
        params: {
          origin: originStr,
          destination: destStr,
          mode: googleMode,
          departure_time: googleMode === "driving" ? "now" : undefined,
          key: config.GOOGLE_MAPS_API_KEY,
        },
      },
    );

    if (response.data.status !== "OK" || !response.data.routes.length) {
      // 1. هطبع الـ Status اللي رجعت (مثلا: REQUEST_DENIED)
      console.log("❌ Google Maps Error Status:", response.data.status); 
      
      // 2. هطبع رسالة السبب بالتفصيل لو جوجل كاتبها
      if (response.data.error_message) {
        console.log("📝 Google Maps Error Message:", response.data.error_message);
      } else {
        console.log("📝 No error message provided by Google (Check coordinates or route availability).");
      }

      throw new AppError("Could not calculate detailed route.", 400);
    }

    const route = response.data.routes[0];
    const leg = route.legs[0];
    let stepsCount = null;
    let caloriesBurned = null;
    if (mode === "walking" && leg.distance && leg.distance.value) {
      const distanceInMeters = leg.distance.value;
      stepsCount = Math.round(distanceInMeters / 0.75); // خطوة كل 75 سم
      caloriesBurned = Math.round(stepsCount * 0.04); // 0.04 كالوري لكل خطوة
    }

    return {
      distanceText: leg.distance.text,
      distanceValue: leg.distance.value, // بالمتر :
      durationMinutes: Math.ceil(
        (leg.duration_in_traffic
          ? leg.duration_in_traffic.value
          : leg.duration.value) / 60,
      ),
      polyline: route.overview_polyline.points, // كود الـ Polyline المشفر اللي الفرونت مستنيه عشان يرسم الطريق!
      stepsCount,
      caloriesBurned,
      rawResponse: route,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Directions Service Error", 500);
  }
};
