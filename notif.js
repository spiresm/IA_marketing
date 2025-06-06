function updateTicketNotif() {
  const tickets = JSON.parse(localStorage.getItem("demandesIA") || "[]");
  const notif = document.getElementById("notif-count");
  if (notif) {
    notif.textContent = tickets.length;
    notif.style.display = tickets.length > 0 ? "inline-block" : "none";
  }
}
