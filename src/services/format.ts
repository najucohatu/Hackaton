export const money = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const dateTime = (d: string | null) =>
  d
    ? new Date(d).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Sem agendamento";
export const shortDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
export const dayKey = (d: Date | string = new Date()) => {
  const v = new Date(d);
  return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
};
export const localInput = (d: string) => {
  const v = new Date(d);
  return `${dayKey(v)}T${String(v.getHours()).padStart(2, "0")}:${String(v.getMinutes()).padStart(2, "0")}`;
};
export const isoInput = (d: string) => (d ? new Date(d).toISOString() : null);
export const isToday = (d: string) => dayKey(d) === dayKey();
export const overdue = (d: string | null) =>
  !!d && Date.parse(d) < Date.now() && !isToday(d);
