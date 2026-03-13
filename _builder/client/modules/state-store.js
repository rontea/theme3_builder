"use strict";

(function exposeStateStore(global) {
    const StateStore = {
        getSnapshot(ctx) {
            const components = typeof ctx.getActiveComponents === "function"
                ? ctx.getActiveComponents()
                : ctx.pageComponents;
            return JSON.parse(JSON.stringify(components));
        },

        pushHistory(ctx) {
            const history = typeof ctx.getActiveHistoryStore === "function"
                ? ctx.getActiveHistoryStore()
                : { undo: ctx.historyUndo, redo: ctx.historyRedo };
            history.undo.push(this.getSnapshot(ctx));
            if (history.undo.length > 100) {
                history.undo.shift();
            }
            history.redo.length = 0;
        },

        undo(ctx) {
            const history = typeof ctx.getActiveHistoryStore === "function"
                ? ctx.getActiveHistoryStore()
                : { undo: ctx.historyUndo, redo: ctx.historyRedo };
            if (history.undo.length === 0) {
                ctx.showToast("Nothing to undo", "warning");
                return;
            }
            history.redo.push(this.getSnapshot(ctx));
            const next = history.undo.pop();
            if (typeof ctx.setActiveComponents === "function") {
                ctx.setActiveComponents(next);
            } else {
                ctx.pageComponents = next;
            }
            ctx.renderCanvasFromState();
        },

        redo(ctx) {
            const history = typeof ctx.getActiveHistoryStore === "function"
                ? ctx.getActiveHistoryStore()
                : { undo: ctx.historyUndo, redo: ctx.historyRedo };
            if (history.redo.length === 0) {
                ctx.showToast("Nothing to redo", "warning");
                return;
            }
            history.undo.push(this.getSnapshot(ctx));
            const next = history.redo.pop();
            if (typeof ctx.setActiveComponents === "function") {
                ctx.setActiveComponents(next);
            } else {
                ctx.pageComponents = next;
            }
            ctx.renderCanvasFromState();
        }
    };

    global.BuilderStateStore = StateStore;
})(window);

