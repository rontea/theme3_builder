"use strict";

(function exposeNotifications(global) {
    const Notifications = {
        hideModal(modal) {
            if (modal) {
                modal.classList.remove("active");
            }
        },

        showToast(message, type = "success") {
            const container = document.getElementById("toastContainer");
            const toast = document.createElement("div");
            toast.className = `toast ${type}`;

            const icon = type === "success"
                ? "check-circle"
                : (type === "error" ? "exclamation-circle" : "exclamation-triangle");

            toast.innerHTML = `
                <i class="fas fa-${icon}"></i>
                <span class="toast-message">${message}</span>
            `;

            container.appendChild(toast);

            setTimeout(() => {
                toast.style.animation = "slideIn 0.3s ease reverse";
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    };

    global.BuilderNotifications = Notifications;
})(window);

