"use strict";

(function exposeStateStore(global) {
    const StateStore = {
        getSnapshot(ctx) {
            return JSON.parse(JSON.stringify(ctx.pageComponents));
        },

        pushHistory(ctx) {
            ctx.historyUndo.push(this.getSnapshot(ctx));
            if (ctx.historyUndo.length > 100) {
                ctx.historyUndo.shift();
            }
            ctx.historyRedo = [];
        },

        undo(ctx) {
            if (ctx.historyUndo.length === 0) {
                ctx.showToast("Nothing to undo", "warning");
                return;
            }
            ctx.historyRedo.push(this.getSnapshot(ctx));
            ctx.pageComponents = ctx.historyUndo.pop();
            ctx.renderCanvasFromState();
        },

        redo(ctx) {
            if (ctx.historyRedo.length === 0) {
                ctx.showToast("Nothing to redo", "warning");
                return;
            }
            ctx.historyUndo.push(this.getSnapshot(ctx));
            ctx.pageComponents = ctx.historyRedo.pop();
            ctx.renderCanvasFromState();
        }
    };

    global.BuilderStateStore = StateStore;
})(window);

