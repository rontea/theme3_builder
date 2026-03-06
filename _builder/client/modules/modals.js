"use strict";

(function exposeModals(global) {
    const Modals = {
        show(modal) {
            if (modal) {
                modal.classList.add("active");
            }
        },
        hide(modal) {
            if (global.BuilderNotifications) {
                global.BuilderNotifications.hideModal(modal);
            } else if (modal) {
                modal.classList.remove("active");
            }
        }
    };

    global.BuilderModals = Modals;
})(window);

