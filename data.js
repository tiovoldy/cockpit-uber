window.UBER_DATA = {
  apiUrl: "https://script.google.com/macros/s/AKfycbwWi4yegeuXdOdk0IGF3PW3gELjGGfWPM9uZpixTppKosRC29pQKjsOaXrZM4HPTAqF/exec",
  updatedAt: "20/11/2026 12:35",
  sheetUrl: "https://docs.google.com/spreadsheets/d/1rjb2CVguIIEtNPFOh1PkFFh8Q643-7K0jYLChlgTT1A/edit",
  cycle: {
    label: "Ter 17/11/2026 → Seg 23/11/2026",
    startDate: "17/11/2026",
    endDate: "23/11/2026",
    rentalCost: 900.0,
    fuelCost: 400.0,
    otherCosts: 0.0,
    daysRemaining: 4 // Sex, Sab, Dom, Seg
  },
  goals: {
    block1: 300,
    block2: 150,
    dailyFloor: 400,
    dailyTarget: 450
  },
  shifts: [
    {
      date: "16/11/2026",
      dayLabel: "Seg 16/11",
      inCurrentCycle: false,
      block: "Bloco 1 (9h-17h)",
      start: "08:41",
      end: "17:00",
      hours: 8.32,
      trips: 31,
      km: null,
      gross: 349.59,
      tips: 0
    },
    {
      date: "17/11/2026",
      dayLabel: "Ter 17/11",
      inCurrentCycle: true,
      block: "Bloco 1 (9h-17h)",
      start: "08:45",
      end: "16:41",
      hours: 7.93,
      trips: 20,
      km: null,
      gross: 281.80,
      tips: 0
    },
    {
      date: "17/11/2026",
      dayLabel: "Ter 17/11",
      inCurrentCycle: true,
      block: "Bloco 2 (18h-22h)",
      start: "18:10",
      end: "23:23",
      hours: 5.22,
      trips: 18,
      km: null,
      gross: 221.90,
      tips: 0
    },
    {
      date: "18/11/2026",
      dayLabel: "Qua 18/11",
      inCurrentCycle: true,
      block: "Bloco 1 (9h-17h)",
      start: "08:56",
      end: "16:26",
      hours: 7.50,
      trips: 21,
      km: null,
      gross: 251.01,
      tips: 0
    },
    {
      date: "18/11/2026",
      dayLabel: "Qua 18/11",
      inCurrentCycle: true,
      block: "Bloco 2 (18h-22h)",
      start: "19:57",
      end: "22:47",
      hours: 2.83,
      trips: 13,
      km: null,
      gross: 134.86,
      tips: 0
    },
    {
      date: "19/11/2026",
      dayLabel: "Qui 19/11",
      inCurrentCycle: true,
      block: "Bloco 1 (9h-17h)",
      start: "08:43",
      end: "16:58",
      hours: 8.25,
      trips: 26,
      km: null,
      gross: 316.88,
      tips: 0
    }
  ],
  expenses: [
    {
      date: "19/11/2026",
      inCurrentCycle: true,
      category: "Combustível",
      fuelType: "-",
      liters: null,
      amount: 400.00,
      note: "Acumulado 17/11 a 19/11"
    }
  ],
  categories: [
    { name: "Uber X", trips: 101, total: 1150.80, avgTicket: 11.39, color: "#3b82f6" },
    { name: "Comfort", trips: 12, total: 222.03, avgTicket: 18.50, color: "#10b981" },
    { name: "Prioridade", trips: 15, total: 164.21, avgTicket: 10.95, color: "#f59e0b" },
    { name: "Uber Pet", trips: 1, total: 19.00, avgTicket: 19.00, color: "#8b5cf6" }
  ]
};
