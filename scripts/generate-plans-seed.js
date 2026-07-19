import fs from "fs";
import path from "path";

import { PLAN_CATEGORIES } from "../lib/waste_collect_plans_seed.js";


const OUT = "./seed/tana4";


const categories = [];
const plans = [];


for (const cat of PLAN_CATEGORIES) {

  categories.push({
    id: cat.id,
    name: cat.name,
    description: cat.description,
    status: "ACTIVE",
  });

  for (const plan of cat.plans) {

    plans.push({

      id: plan.id.toUpperCase(),

      categoryId: cat.id,

      name: plan.name,

      segment: plan.segment,

      billing: plan.billing,

      frequency: plan.frequency,

      frequencyPerWeek: plan.frequencyPerWeek,

      maxBins: plan.maxBins,

      status: "ACTIVE",
    });

  }

}


// ensure folder exists
if (!fs.existsSync(OUT)) {
  fs.mkdirSync(OUT, { recursive: true });
}


// write files

fs.writeFileSync(
  path.join(OUT, "plan_categories.json"),
  JSON.stringify(categories, null, 2)
);

fs.writeFileSync(
  path.join(OUT, "plans.json"),
  JSON.stringify(plans, null, 2)
);


console.log("Plans seed generated");