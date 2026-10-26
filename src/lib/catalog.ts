// Seeded catalogues for the posting form. Consistent names matter: the price
// rating compares ads with the same make/brand and model.

export type CarMake = { name: string; ar: string; models: string[] };

const m = (name: string, ar: string, models: string[]): CarMake => ({ name, ar, models: [...models, "Other"] });

export const carMakes: CarMake[] = [
  m("Toyota", "تويوتا", ["Camry", "Corolla", "Yaris", "Land Cruiser", "Land Cruiser Pickup", "Hilux", "Prado", "Fortuner", "RAV4", "Avalon", "Innova", "Hiace", "Rush", "Raize", "Sequoia", "FJ Cruiser"]),
  m("Hyundai", "هيونداي", ["Accent", "Elantra", "Sonata", "Tucson", "Santa Fe", "Creta", "Azera", "Palisade", "Kona", "Staria", "H1"]),
  m("Nissan", "نيسان", ["Sunny", "Altima", "Maxima", "Patrol", "Patrol Pickup", "X-Trail", "Kicks", "Pathfinder", "Navara", "Urvan"]),
  m("Kia", "كيا", ["Pegas", "Rio", "Cerato", "K5", "K8", "Sportage", "Sorento", "Seltos", "Telluride", "Carnival", "Sonet"]),
  m("Chevrolet", "شيفروليه", ["Tahoe", "Suburban", "Silverado", "Malibu", "Spark", "Captiva", "Groove", "Traverse", "Camaro"]),
  m("GMC", "جي إم سي", ["Yukon", "Sierra", "Acadia", "Terrain"]),
  m("Ford", "فورد", ["Taurus", "Explorer", "Expedition", "F-150", "Edge", "Territory", "Mustang", "Ranger"]),
  m("Lexus", "لكزس", ["ES", "LS", "IS", "RX", "LX", "GX", "NX", "UX"]),
  m("Honda", "هوندا", ["Accord", "Civic", "City", "CR-V", "Pilot", "HR-V"]),
  m("Mazda", "مازدا", ["Mazda 3", "Mazda 6", "CX-3", "CX-5", "CX-9", "CX-30", "CX-60", "CX-90"]),
  m("Mitsubishi", "ميتسوبيشي", ["Lancer", "Attrage", "Pajero", "Outlander", "ASX", "L200", "Xpander"]),
  m("Mercedes-Benz", "مرسيدس بنز", ["C-Class", "E-Class", "S-Class", "GLC", "GLE", "GLS", "G-Class", "A-Class", "CLA"]),
  m("BMW", "بي إم دبليو", ["3 Series", "5 Series", "7 Series", "X3", "X5", "X6", "X7"]),
  m("Audi", "أودي", ["A4", "A6", "A8", "Q5", "Q7", "Q8"]),
  m("Volkswagen", "فولكس واجن", ["Passat", "Jetta", "Tiguan", "Teramont", "Golf", "Touareg"]),
  m("Land Rover", "لاند روفر", ["Range Rover", "Range Rover Sport", "Range Rover Velar", "Defender", "Discovery"]),
  m("Jeep", "جيب", ["Wrangler", "Grand Cherokee", "Cherokee", "Compass", "Gladiator"]),
  m("Dodge", "دودج", ["Charger", "Challenger", "Durango", "Ram"]),
  m("Isuzu", "إيسوزو", ["D-Max", "MU-X", "NPR"]),
  m("Changan", "شانجان", ["Alsvin", "Eado", "CS35", "CS75", "CS85", "CS95", "UNI-K", "UNI-T"]),
  m("Geely", "جيلي", ["Emgrand", "Coolray", "Tugella", "Monjaro", "Okavango", "Starray"]),
  m("MG", "إم جي", ["MG5", "MG6", "ZS", "HS", "RX5", "RX8", "GT"]),
  m("Haval", "هافال", ["Jolion", "H6", "Dargo", "H9"]),
  m("Chery", "شيري", ["Arrizo 5", "Arrizo 6", "Tiggo 4", "Tiggo 7", "Tiggo 8"]),
  m("Jetour", "جيتور", ["X70", "X90", "Dashing", "T2"]),
  m("Suzuki", "سوزوكي", ["Dzire", "Swift", "Ciaz", "Ertiga", "Jimny", "Vitara"]),
  m("Infiniti", "إنفينيتي", ["Q50", "QX50", "QX60", "QX80"]),
  m("Cadillac", "كاديلاك", ["Escalade", "CT5", "XT5", "XT6"]),
  m("Porsche", "بورش", ["Cayenne", "Macan", "Panamera", "911"]),
  m("Tesla", "تسلا", ["Model 3", "Model Y", "Model S", "Model X"]),
  m("Other", "أخرى", []),
];

export type ElectronicsBrand = { name: string; models: string[] };

export const electronicsBrands: ElectronicsBrand[] = [
  { name: "Apple", models: ["iPhone 11", "iPhone 12", "iPhone 12 Pro", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max", "iPhone 14", "iPhone 14 Pro", "iPhone 14 Pro Max", "iPhone 15", "iPhone 15 Pro", "iPhone 15 Pro Max", "iPhone 16", "iPhone 16 Pro", "iPhone 16 Pro Max", "iPhone 17", "iPhone 17 Pro", "iPhone 17 Pro Max", "MacBook Air M1", "MacBook Air M2", "MacBook Air M3", "MacBook Pro 14", "MacBook Pro 16", "iPad", "iPad Air", "iPad Pro", "iPad mini"] },
  { name: "Samsung", models: ["Galaxy S22", "Galaxy S22 Ultra", "Galaxy S23", "Galaxy S23 Ultra", "Galaxy S24", "Galaxy S24 Ultra", "Galaxy S25", "Galaxy S25 Ultra", "Galaxy Z Fold5", "Galaxy Z Fold6", "Galaxy Z Flip5", "Galaxy Z Flip6", "Galaxy A54", "Galaxy A55", "Galaxy Tab S9"] },
  { name: "Huawei", models: ["Mate 60 Pro", "P60 Pro", "Nova 12", "MatePad"] },
  { name: "Xiaomi", models: ["Redmi Note 13", "Redmi Note 14", "Xiaomi 14", "Xiaomi 15", "Poco F6"] },
  { name: "Honor", models: ["Magic6 Pro", "Honor 200", "X9b"] },
  { name: "Oppo", models: ["Reno 11", "Reno 12", "Find X7"] },
  { name: "Google", models: ["Pixel 8", "Pixel 8 Pro", "Pixel 9", "Pixel 9 Pro"] },
  { name: "Dell", models: ["XPS 13", "XPS 15", "Inspiron 15", "Latitude 5440", "Alienware m16"] },
  { name: "HP", models: ["Pavilion 15", "Envy 13", "Spectre x360", "EliteBook 840", "Victus 15", "Omen 16"] },
  { name: "Lenovo", models: ["ThinkPad X1 Carbon", "ThinkPad T14", "IdeaPad 5", "Legion 5", "Yoga 7"] },
  { name: "Asus", models: ["ROG Strix G16", "TUF Gaming F15", "Zenbook 14", "Vivobook 15"] },
  { name: "Acer", models: ["Aspire 5", "Nitro 5", "Predator Helios", "Swift 3"] },
  { name: "MSI", models: ["Katana 15", "Stealth 16", "Modern 14"] },
  { name: "Microsoft", models: ["Surface Pro", "Surface Laptop", "Xbox Series X", "Xbox Series S"] },
  { name: "Sony", models: ["PlayStation 5", "PlayStation 5 Slim", "PlayStation 5 Pro", "PlayStation 4"] },
  { name: "Nintendo", models: ["Switch", "Switch OLED", "Switch 2"] },
  { name: "Other", models: [] },
];
