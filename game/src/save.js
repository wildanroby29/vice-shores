// Save slots: 3 slots in localStorage, with job, money and date.
const KEY = 'vice-shores-saves-v1';
export function listSaves() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[null,null,null]'); }
  catch { return [null, null, null]; }
}
export function saveSlot(i, state) {
  const saves = listSaves();
  saves[i] = {
    job: state.done + 1, money: state.money,
    date: new Date().toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
    xp: state.xp, wanted: state.wanted, cars: state.cars, dist: state.dist, shots: state.shots, coll: state.coll,
  };
  try { localStorage.setItem(KEY, JSON.stringify(saves)); } catch { /* storage unavailable */ }
  return saves;
}
export function loadSlot(i) {
  const saves = listSaves();
  return saves[i] || null;
}
