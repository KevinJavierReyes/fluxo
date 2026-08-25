import { CategoryType } from "../enums";

export interface DefaultCategoryGroupSeed {
  name: string;
  type: CategoryType;
  categories: string[];
}

// Replica los grupos y subcategorías del Excel "Inventario Finanzas Personales".
export const DEFAULT_CATEGORY_GROUPS: DefaultCategoryGroupSeed[] = [
  {
    name: "Ingresos",
    type: CategoryType.INCOME,
    categories: ["Salario"],
  },
  {
    name: "Deudas",
    type: CategoryType.EXPENSE,
    categories: ["Tarjeta de crédito", "Préstamo personal", "Pago de casa", "Pago de departamento"],
  },
  {
    name: "Ahorro",
    type: CategoryType.EXPENSE,
    categories: ["Ahorro general"],
  },
  {
    name: "Alimentación",
    type: CategoryType.EXPENSE,
    categories: ["Mercado", "Diario", "Comidas fuera del hogar", "Golosinas"],
  },
  {
    name: "Vivienda",
    type: CategoryType.EXPENSE,
    categories: [
      "Arriendo",
      "Administración",
      "Agua",
      "Luz",
      "Teléfono e internet",
      "Gas",
      "Muebles y aparatos de casa + Reparaciones",
      "Parabólica",
      "Utensilios domésticos",
      "Ropa del hogar",
      "Artículos de limpieza del hogar",
    ],
  },
  {
    name: "Vestuario",
    type: CategoryType.EXPENSE,
    categories: ["Vestuario", "Uniformes", "Servicios de vestuario/calzado"],
  },
  {
    name: "Salud",
    type: CategoryType.EXPENSE,
    categories: ["Servicios / productos de salud", "Medicina prepagada"],
  },
  {
    name: "Educación",
    type: CategoryType.EXPENSE,
    categories: ["Instrucción y enseñanza", "Artículos escolares"],
  },
  {
    name: "Cultura, diversión y esparcimiento",
    type: CategoryType.EXPENSE,
    categories: ["Membresías", "Salidas", "Eventos y servicios"],
  },
  {
    name: "Transporte",
    type: CategoryType.EXPENSE,
    categories: [
      "SITP / Transmilenio",
      "Seguro carro",
      "Taxi",
      "Uber",
      "Gasolina y peajes",
      "Impuestos",
      "Mantenimiento vehículo",
      "Otros",
    ],
  },
  {
    name: "Comunicaciones",
    type: CategoryType.EXPENSE,
    categories: ["Celular", "Minutos e internet (calle)", "Otros"],
  },
  {
    name: "Otros gastos",
    type: CategoryType.EXPENSE,
    categories: [
      "Bebidas alcohólicas y cigarrillos",
      "Aseo y cuidado personal",
      "Joyería y otros artículos",
      "Regalos",
      "Mascotas",
      "Diario",
      "Gastos financieros",
      "Otros",
    ],
  },
];
