"use babel";

import { CompositeDisposable, BufferedProcess } from "atom";

export default {
  config: {
    fmtOnSave: {
      type: "boolean",
      default: true,
      title: "Format on save"
    },
    lineLength: {
      type: "integer",
      default: "88",
      minimum: 1,
      title: "Maximum line length",
      description: "Leave as default to pickup settings from pyproject.toml"
    },
    binPath: {
      type: "string",
      default: "black",
      title: "Path to the black executable"
    },
    disableProjectNames: {
      type: "string",
      default: "",
      title: "Disable project names"
    },
    skipStringNormalization: {
      type: "boolean",
      default: false,
      title: "Skip string normalization"
    },
    skipNumericUnderscoreNormalization: {
      type: "boolean",
      default: false,
      title: "Skip numeric underscore normalization"
    },
    showErrors: {
      type: "string",
      default: "show",
      enum: [
        {value: "flash", description:"Dismiss after 5 seconds"},
        {value: "hide", description: "Hide"},
        {value: "show", description: "Show until dismissed"}
      ],
      title: "Errors"
    }
  },
  subscriptions: null,
  disableAutoFormat: null,

  activate(state) {
    this.subscriptions = new CompositeDisposable();
    var projectName = document.querySelector('.atom-dock-content-wrapper.left .tool-panel.tree-view .project-root-header span').innerText
    disableAutoFormat = atom.config.get("python-black.disableProjectNames").split(',').includes(projectName)

    this.subscriptions.add(
      atom.workspace.observeTextEditors(textEditor => {
        if (textEditor.getGrammar().scopeName == "source.python") {
          this.subscriptions.add(
            textEditor.onDidSave(event => {
              if (atom.config.get("python-black.fmtOnSave")) {
                this.formatFile(event.path);
              }
            })
          );
        }
      })
    );

    this.subscriptions.add(
      atom.commands.add(
        'atom-text-editor[data-grammar="source python"]',
        "python-black:format",
        () => {
          this.formatEditor(atom.workspace.getActiveTextEditor());
        }
      )
    );

    this.subscriptions.add(
      atom.commands.add(
        "atom-workspace",
        "python-black:toggle-format-on-save",
        () => {
          atom.config.set(
            "python-black.fmtOnSave",
            !atom.config.get("python-black.fmtOnSave")
          );
        }
      )
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  handleError(err) {
    errors = atom.config.get("python-black.showErrors")
    if (errors != "hide") {
      atom.notifications.addError("Black failed to reformat 💥 💔 💥", {
        detail: err,
        dismissable: errors == "show" ? true : false
      });
    }
  },

  loadArgs() {
    const args = ["-q"];
    lineLength = atom.config.get("python-black.lineLength")
    if (atom.config.getSchema("python-black.lineLength").default != lineLength) {
      args.push("-l", lineLength);
    }
    if (atom.config.get("python-black.skipStringNormalization")) {
      args.push("-S");
    }
    if (atom.config.get("python-black.skipNumericUnderscoreNormalization")) {
      args.push("-N");
    }
    return args;
  },

  formatFile(file) {
    const args = this.loadArgs();
    args.push(file);

    if(disableAutoFormat) {
        return
    }


    new BufferedProcess({
      command: atom.config.get("python-black.binPath"),
      args: args,
      stderr: err => {
        this.handleError(err);
      }
    });
  },

  formatEditor(textEditor) {
    const args = this.loadArgs();
    args.push("-"); // Set black to read from stdin

    if(disableAutoFormat) {
        return
    }
    
    bp = new BufferedProcess({
      command: atom.config.get("python-black.binPath"),
      args: args,
      stdout: out => {
        textEditor.setText(out);
      },
      stderr: err => {
        this.handleError(err);
      }
    });
    bp.process.stdin.write(textEditor.getText());
    bp.process.stdin.end();
  }
};
