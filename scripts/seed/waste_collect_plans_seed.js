export const WASTE_COLLECT_PLAN_CATEGORIES = [

  // =============================
  // HOUSEHOLDS
  // =============================

  {
    id: "household",
    name: "Households",
    description: "Individual homes and apartments",

    plans: [

      {
        id: "hh-starter",
        name: "Starter",
        segment: "household",
        billing: "per_pickup",
        frequency: "On-demand",
        maxBins: 2,
        price: "Free + per pickup",
        idealFor: "Low-waste households",
        bullets: [
          "No monthly commitment",
          "Pay only when needed",
          "Up to 2 bins per pickup",
        ],
      },

      {
        id: "hh-standard",
        name: "Standard Weekly",
        segment: "household",
        billing: "monthly",
        frequency: "1 pickup / week",
        frequencyPerWeek: 1,
        maxBins: 3,
        price: "X,XXX Ar / month",
        idealFor: "Typical households",
        bullets: [
          "Scheduled weekly pickup",
          "Up to 3 bins",
          "Extra pickups optional",
        ],
      },

      {
        id: "hh-family",
        name: "Family",
        segment: "household",
        billing: "monthly",
        frequency: "2 pickups / week",
        frequencyPerWeek: 2,
        maxBins: 5,
        price: "Y,YYY Ar / month",
        idealFor: "Large families",
        bullets: [
          "Twice weekly pickup",
          "Higher bin allowance",
          "Priority support",
        ],
      },

      {
        id: "hh-eco",
        name: "Eco Sort",
        segment: "household",
        billing: "monthly",
        frequency: "1 pickup / week",
        frequencyPerWeek: 1,
        maxBins: 3,
        price: "Lower if sorted",
        idealFor: "Households sorting waste",
        bullets: [
          "Discount for sorted waste",
          "Supports recycling",
          "Environmental impact tracking",
        ],
      },

    ],
  },


  // =============================
  // BUILDINGS
  // =============================

  {
    id: "buildings",
    name: "Buildings & Residences",
    description: "Apartments, residences",

    plans: [

      {
        id: "bld-small",
        name: "Small Residence",
        segment: "building",
        billing: "monthly",
        frequency: "2 pickups / week",
        maxBins: 10,
        price: "Custom",
        idealFor: "Small buildings",
        bullets: [
          "Caretaker managed",
          "Shared bins",
          "Flexible schedule",
        ],
      },

      {
        id: "bld-large",
        name: "Large Residence",
        segment: "building",
        billing: "monthly",
        frequency: "3–6 pickups / week",
        maxBins: 30,
        price: "Custom",
        idealFor: "Large residences",
        bullets: [
          "High volume",
          "Dedicated route",
          "Overflow support",
        ],
      },

    ],
  },


  // =============================
  // SCHOOLS
  // =============================

  {
    id: "schools",
    name: "Schools",
    description: "Primary and secondary schools",

    plans: [

      {
        id: "sch-public",
        name: "Public School",
        segment: "school",
        billing: "monthly",
        frequency: "1–3 pickups / week",
        price: "Subsidised",
        idealFor: "Government schools",
        bullets: [
          "Basic collection",
          "Sorting guidance",
          "Education support",
        ],
      },

      {
        id: "sch-private",
        name: "Private School",
        segment: "school",
        billing: "monthly",
        frequency: "2–5 pickups / week",
        price: "Custom",
        idealFor: "Private schools",
        bullets: [
          "Recycling streams",
          "Education pack",
          "Impact reports",
        ],
      },

    ],
  },


  // =============================
  // BUSINESS
  // =============================

  {
    id: "business",
    name: "Business & Admin",
    description: "Offices and SMEs",

    plans: [

      {
        id: "biz-standard",
        name: "Office Plan",
        segment: "business",
        billing: "monthly",
        frequency: "1–5 pickups / week",
        price: "Per bin",
        idealFor: "SMEs",
        bullets: [
          "Flexible bins",
          "Recycling option",
          "Service agreement",
        ],
      },

    ],
  },


  // =============================
  // HOTELS / EVENTS
  // =============================

  {
    id: "hospitality",
    name: "Hotels & Events",
    description: "Hotels, venues, events",

    plans: [

      {
        id: "event-flex",
        name: "Event Flex",
        segment: "event",
        billing: "per_pickup",
        frequency: "On-demand",
        price: "Per event",
        idealFor: "Festivals",
        bullets: [
          "Temporary bins",
          "Cleanup included",
          "Impact report",
        ],
      },

      {
        id: "hotel-regular",
        name: "Hotel Regular",
        segment: "hotel",
        billing: "monthly",
        frequency: "Daily",
        price: "Custom",
        idealFor: "Hotels",
        bullets: [
          "Kitchen waste",
          "Glass recycling",
          "Flexible schedule",
        ],
      },

    ],
  },


  // =============================
  // VIP
  // =============================

  {
    id: "vip",
    name: "VIP",
    description: "High-touch service",

    plans: [

      {
        id: "vip-bespoke",
        name: "VIP Bespoke",
        segment: "vip",
        billing: "custom",
        price: "Quote",
        idealFor: "High-end clients",
        bullets: [
          "Dedicated team",
          "Discreet pickup",
          "Custom reporting",
        ],
      },

    ],
  },

];