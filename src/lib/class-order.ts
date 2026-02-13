
export const CLASS_CATEGORIES = [
    { label: "Pre-School", options: ["Nursery1", "Nursery2", "KG1", "KG2"] },
    { label: "Lower Primary", options: ["Prim1", "Prim2", "Prim3"] },
    { label: "Upper Primary", options: ["Prim4", "Prim5", "Prim6"] },
    { label: "Junior High", options: ["JHS1", "JHS2", "JHS3"] },
];

export const CLASS_ORDER = CLASS_CATEGORIES.flatMap(g => g.options);
