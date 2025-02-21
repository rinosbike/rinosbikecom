document.addEventListener("DOMContentLoaded", function() {
    filterSuppliers();
});

function filterSuppliers() {
    let searchInput = document.getElementById("supplierSearch").value.toLowerCase();
    let supplierCards = document.querySelectorAll(".supplier-card");

    supplierCards.forEach(card => {
        let name = card.getAttribute("data-name").toLowerCase();
        if (name.includes(searchInput)) {
            card.style.display = "block";
        } else {
            card.style.display = "none";
        }
    });
}

function showDetails(name) {
    alert("More details for " + name);
}