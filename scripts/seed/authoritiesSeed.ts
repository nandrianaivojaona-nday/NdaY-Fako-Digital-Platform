export const authoritiesSeed = [
    {
      id: "citizen_full",
      position: "citizen",
      acting: "full",
      authorities: [
        {
          function: "service_request",
          actions: ["create", "read"],
          scope: "household",
        },
        {
          function: "collection",
          actions: ["read", "validate"],
          scope: "household",
        },
      ],
    },
    {
      id: "collector_full",
      position: "collector",
      acting: "full",
      authorities: [
        {
          function: "collection",
          actions: ["execute", "read"],
          scope: "operator",
        },
      ],
    },
    {
      id: "supervisor_full",
      position: "supervisor",
      acting: "full",
      authorities: [
        {
          function: "planning",
          actions: ["assign", "read", "update"],
          scope: "operator",
        },
        {
          function: "collection",
          actions: ["read", "update"],
          scope: "operator",
        },
      ],
    },
    {
      id: "operator_ceo_full",
      position: "operator_ceo",
      acting: "full",
      authorities: [
        {
          function: "planning",
          actions: ["read"],
          scope: "operator",
        },
        {
          function: "reporting",
          actions: ["read"],
          scope: "operator",
        },
        {
          function: "operator_management",
          actions: ["read", "update"],
          scope: "operator",
        },
      ],
    },
    {
      id: "fokontany_admin_full",
      position: "fokontany_admin",
      acting: "full",
      authorities: [
        {
          function: "aggregation",
          actions: ["read", "validate"],
          scope: "fokontany",
        },
        {
          function: "transport",
          actions: ["read"],
          scope: "municipality",
        },
      ],
    },
    {
      id: "municipality_admin_full",
      position: "municipality_admin",
      acting: "full",
      authorities: [
        {
          function: "aggregation",
          actions: ["read"],
          scope: "municipality",
        },
        {
          function: "transport",
          actions: ["assign", "validate"],
          scope: "municipality",
        },
        {
          function: "reporting",
          actions: ["read"],
          scope: "municipality",
        },
      ],
    },
    {
      id: "super_admin_full",
      position: "super_admin",
      acting: "full",
      authorities: [
        {
          function: "operator_management",
          actions: ["create", "read", "update"],
          scope: "global",
        },
        {
          function: "user_management",
          actions: ["create", "read", "update", "delete"],
          scope: "global",
        },
        {
          function: "reporting",
          actions: ["read"],
          scope: "global",
        },
      ],
    },
  ];