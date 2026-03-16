#!/usr/bin/env bun
// @bun
var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = import.meta.require;

// node_modules/commander/lib/error.js
var require_error = __commonJS((exports) => {
  class CommanderError extends Error {
    constructor(exitCode, code, message) {
      super(message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
      this.code = code;
      this.exitCode = exitCode;
      this.nestedError = undefined;
    }
  }

  class InvalidArgumentError extends CommanderError {
    constructor(message) {
      super(1, "commander.invalidArgument", message);
      Error.captureStackTrace(this, this.constructor);
      this.name = this.constructor.name;
    }
  }
  exports.CommanderError = CommanderError;
  exports.InvalidArgumentError = InvalidArgumentError;
});

// node_modules/commander/lib/argument.js
var require_argument = __commonJS((exports) => {
  var { InvalidArgumentError } = require_error();

  class Argument {
    constructor(name, description) {
      this.description = description || "";
      this.variadic = false;
      this.parseArg = undefined;
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.argChoices = undefined;
      switch (name[0]) {
        case "<":
          this.required = true;
          this._name = name.slice(1, -1);
          break;
        case "[":
          this.required = false;
          this._name = name.slice(1, -1);
          break;
        default:
          this.required = true;
          this._name = name;
          break;
      }
      if (this._name.length > 3 && this._name.slice(-3) === "...") {
        this.variadic = true;
        this._name = this._name.slice(0, -3);
      }
    }
    name() {
      return this._name;
    }
    _concatValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) {
        return [value];
      }
      return previous.concat(value);
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg)) {
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        }
        if (this.variadic) {
          return this._concatValue(arg, previous);
        }
        return arg;
      };
      return this;
    }
    argRequired() {
      this.required = true;
      return this;
    }
    argOptional() {
      this.required = false;
      return this;
    }
  }
  function humanReadableArgName(arg) {
    const nameOutput = arg.name() + (arg.variadic === true ? "..." : "");
    return arg.required ? "<" + nameOutput + ">" : "[" + nameOutput + "]";
  }
  exports.Argument = Argument;
  exports.humanReadableArgName = humanReadableArgName;
});

// node_modules/commander/lib/help.js
var require_help = __commonJS((exports) => {
  var { humanReadableArgName } = require_argument();

  class Help {
    constructor() {
      this.helpWidth = undefined;
      this.sortSubcommands = false;
      this.sortOptions = false;
      this.showGlobalOptions = false;
    }
    visibleCommands(cmd) {
      const visibleCommands = cmd.commands.filter((cmd2) => !cmd2._hidden);
      const helpCommand = cmd._getHelpCommand();
      if (helpCommand && !helpCommand._hidden) {
        visibleCommands.push(helpCommand);
      }
      if (this.sortSubcommands) {
        visibleCommands.sort((a, b) => {
          return a.name().localeCompare(b.name());
        });
      }
      return visibleCommands;
    }
    compareOptions(a, b) {
      const getSortKey = (option) => {
        return option.short ? option.short.replace(/^-/, "") : option.long.replace(/^--/, "");
      };
      return getSortKey(a).localeCompare(getSortKey(b));
    }
    visibleOptions(cmd) {
      const visibleOptions = cmd.options.filter((option) => !option.hidden);
      const helpOption = cmd._getHelpOption();
      if (helpOption && !helpOption.hidden) {
        const removeShort = helpOption.short && cmd._findOption(helpOption.short);
        const removeLong = helpOption.long && cmd._findOption(helpOption.long);
        if (!removeShort && !removeLong) {
          visibleOptions.push(helpOption);
        } else if (helpOption.long && !removeLong) {
          visibleOptions.push(cmd.createOption(helpOption.long, helpOption.description));
        } else if (helpOption.short && !removeShort) {
          visibleOptions.push(cmd.createOption(helpOption.short, helpOption.description));
        }
      }
      if (this.sortOptions) {
        visibleOptions.sort(this.compareOptions);
      }
      return visibleOptions;
    }
    visibleGlobalOptions(cmd) {
      if (!this.showGlobalOptions)
        return [];
      const globalOptions = [];
      for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        const visibleOptions = ancestorCmd.options.filter((option) => !option.hidden);
        globalOptions.push(...visibleOptions);
      }
      if (this.sortOptions) {
        globalOptions.sort(this.compareOptions);
      }
      return globalOptions;
    }
    visibleArguments(cmd) {
      if (cmd._argsDescription) {
        cmd.registeredArguments.forEach((argument) => {
          argument.description = argument.description || cmd._argsDescription[argument.name()] || "";
        });
      }
      if (cmd.registeredArguments.find((argument) => argument.description)) {
        return cmd.registeredArguments;
      }
      return [];
    }
    subcommandTerm(cmd) {
      const args = cmd.registeredArguments.map((arg) => humanReadableArgName(arg)).join(" ");
      return cmd._name + (cmd._aliases[0] ? "|" + cmd._aliases[0] : "") + (cmd.options.length ? " [options]" : "") + (args ? " " + args : "");
    }
    optionTerm(option) {
      return option.flags;
    }
    argumentTerm(argument) {
      return argument.name();
    }
    longestSubcommandTermLength(cmd, helper) {
      return helper.visibleCommands(cmd).reduce((max, command) => {
        return Math.max(max, helper.subcommandTerm(command).length);
      }, 0);
    }
    longestOptionTermLength(cmd, helper) {
      return helper.visibleOptions(cmd).reduce((max, option) => {
        return Math.max(max, helper.optionTerm(option).length);
      }, 0);
    }
    longestGlobalOptionTermLength(cmd, helper) {
      return helper.visibleGlobalOptions(cmd).reduce((max, option) => {
        return Math.max(max, helper.optionTerm(option).length);
      }, 0);
    }
    longestArgumentTermLength(cmd, helper) {
      return helper.visibleArguments(cmd).reduce((max, argument) => {
        return Math.max(max, helper.argumentTerm(argument).length);
      }, 0);
    }
    commandUsage(cmd) {
      let cmdName = cmd._name;
      if (cmd._aliases[0]) {
        cmdName = cmdName + "|" + cmd._aliases[0];
      }
      let ancestorCmdNames = "";
      for (let ancestorCmd = cmd.parent;ancestorCmd; ancestorCmd = ancestorCmd.parent) {
        ancestorCmdNames = ancestorCmd.name() + " " + ancestorCmdNames;
      }
      return ancestorCmdNames + cmdName + " " + cmd.usage();
    }
    commandDescription(cmd) {
      return cmd.description();
    }
    subcommandDescription(cmd) {
      return cmd.summary() || cmd.description();
    }
    optionDescription(option) {
      const extraInfo = [];
      if (option.argChoices) {
        extraInfo.push(`choices: ${option.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      }
      if (option.defaultValue !== undefined) {
        const showDefault = option.required || option.optional || option.isBoolean() && typeof option.defaultValue === "boolean";
        if (showDefault) {
          extraInfo.push(`default: ${option.defaultValueDescription || JSON.stringify(option.defaultValue)}`);
        }
      }
      if (option.presetArg !== undefined && option.optional) {
        extraInfo.push(`preset: ${JSON.stringify(option.presetArg)}`);
      }
      if (option.envVar !== undefined) {
        extraInfo.push(`env: ${option.envVar}`);
      }
      if (extraInfo.length > 0) {
        return `${option.description} (${extraInfo.join(", ")})`;
      }
      return option.description;
    }
    argumentDescription(argument) {
      const extraInfo = [];
      if (argument.argChoices) {
        extraInfo.push(`choices: ${argument.argChoices.map((choice) => JSON.stringify(choice)).join(", ")}`);
      }
      if (argument.defaultValue !== undefined) {
        extraInfo.push(`default: ${argument.defaultValueDescription || JSON.stringify(argument.defaultValue)}`);
      }
      if (extraInfo.length > 0) {
        const extraDescripton = `(${extraInfo.join(", ")})`;
        if (argument.description) {
          return `${argument.description} ${extraDescripton}`;
        }
        return extraDescripton;
      }
      return argument.description;
    }
    formatHelp(cmd, helper) {
      const termWidth = helper.padWidth(cmd, helper);
      const helpWidth = helper.helpWidth || 80;
      const itemIndentWidth = 2;
      const itemSeparatorWidth = 2;
      function formatItem(term, description) {
        if (description) {
          const fullText = `${term.padEnd(termWidth + itemSeparatorWidth)}${description}`;
          return helper.wrap(fullText, helpWidth - itemIndentWidth, termWidth + itemSeparatorWidth);
        }
        return term;
      }
      function formatList(textArray) {
        return textArray.join(`
`).replace(/^/gm, " ".repeat(itemIndentWidth));
      }
      let output = [`Usage: ${helper.commandUsage(cmd)}`, ""];
      const commandDescription = helper.commandDescription(cmd);
      if (commandDescription.length > 0) {
        output = output.concat([
          helper.wrap(commandDescription, helpWidth, 0),
          ""
        ]);
      }
      const argumentList = helper.visibleArguments(cmd).map((argument) => {
        return formatItem(helper.argumentTerm(argument), helper.argumentDescription(argument));
      });
      if (argumentList.length > 0) {
        output = output.concat(["Arguments:", formatList(argumentList), ""]);
      }
      const optionList = helper.visibleOptions(cmd).map((option) => {
        return formatItem(helper.optionTerm(option), helper.optionDescription(option));
      });
      if (optionList.length > 0) {
        output = output.concat(["Options:", formatList(optionList), ""]);
      }
      if (this.showGlobalOptions) {
        const globalOptionList = helper.visibleGlobalOptions(cmd).map((option) => {
          return formatItem(helper.optionTerm(option), helper.optionDescription(option));
        });
        if (globalOptionList.length > 0) {
          output = output.concat([
            "Global Options:",
            formatList(globalOptionList),
            ""
          ]);
        }
      }
      const commandList = helper.visibleCommands(cmd).map((cmd2) => {
        return formatItem(helper.subcommandTerm(cmd2), helper.subcommandDescription(cmd2));
      });
      if (commandList.length > 0) {
        output = output.concat(["Commands:", formatList(commandList), ""]);
      }
      return output.join(`
`);
    }
    padWidth(cmd, helper) {
      return Math.max(helper.longestOptionTermLength(cmd, helper), helper.longestGlobalOptionTermLength(cmd, helper), helper.longestSubcommandTermLength(cmd, helper), helper.longestArgumentTermLength(cmd, helper));
    }
    wrap(str, width, indent, minColumnWidth = 40) {
      const indents = " \\f\\t\\v\xA0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF";
      const manualIndent = new RegExp(`[\\n][${indents}]+`);
      if (str.match(manualIndent))
        return str;
      const columnWidth = width - indent;
      if (columnWidth < minColumnWidth)
        return str;
      const leadingStr = str.slice(0, indent);
      const columnText = str.slice(indent).replace(`\r
`, `
`);
      const indentString = " ".repeat(indent);
      const zeroWidthSpace = "\u200B";
      const breaks = `\\s${zeroWidthSpace}`;
      const regex = new RegExp(`
|.{1,${columnWidth - 1}}([${breaks}]|$)|[^${breaks}]+?([${breaks}]|$)`, "g");
      const lines = columnText.match(regex) || [];
      return leadingStr + lines.map((line, i) => {
        if (line === `
`)
          return "";
        return (i > 0 ? indentString : "") + line.trimEnd();
      }).join(`
`);
    }
  }
  exports.Help = Help;
});

// node_modules/commander/lib/option.js
var require_option = __commonJS((exports) => {
  var { InvalidArgumentError } = require_error();

  class Option {
    constructor(flags, description) {
      this.flags = flags;
      this.description = description || "";
      this.required = flags.includes("<");
      this.optional = flags.includes("[");
      this.variadic = /\w\.\.\.[>\]]$/.test(flags);
      this.mandatory = false;
      const optionFlags = splitOptionFlags(flags);
      this.short = optionFlags.shortFlag;
      this.long = optionFlags.longFlag;
      this.negate = false;
      if (this.long) {
        this.negate = this.long.startsWith("--no-");
      }
      this.defaultValue = undefined;
      this.defaultValueDescription = undefined;
      this.presetArg = undefined;
      this.envVar = undefined;
      this.parseArg = undefined;
      this.hidden = false;
      this.argChoices = undefined;
      this.conflictsWith = [];
      this.implied = undefined;
    }
    default(value, description) {
      this.defaultValue = value;
      this.defaultValueDescription = description;
      return this;
    }
    preset(arg) {
      this.presetArg = arg;
      return this;
    }
    conflicts(names) {
      this.conflictsWith = this.conflictsWith.concat(names);
      return this;
    }
    implies(impliedOptionValues) {
      let newImplied = impliedOptionValues;
      if (typeof impliedOptionValues === "string") {
        newImplied = { [impliedOptionValues]: true };
      }
      this.implied = Object.assign(this.implied || {}, newImplied);
      return this;
    }
    env(name) {
      this.envVar = name;
      return this;
    }
    argParser(fn) {
      this.parseArg = fn;
      return this;
    }
    makeOptionMandatory(mandatory = true) {
      this.mandatory = !!mandatory;
      return this;
    }
    hideHelp(hide = true) {
      this.hidden = !!hide;
      return this;
    }
    _concatValue(value, previous) {
      if (previous === this.defaultValue || !Array.isArray(previous)) {
        return [value];
      }
      return previous.concat(value);
    }
    choices(values) {
      this.argChoices = values.slice();
      this.parseArg = (arg, previous) => {
        if (!this.argChoices.includes(arg)) {
          throw new InvalidArgumentError(`Allowed choices are ${this.argChoices.join(", ")}.`);
        }
        if (this.variadic) {
          return this._concatValue(arg, previous);
        }
        return arg;
      };
      return this;
    }
    name() {
      if (this.long) {
        return this.long.replace(/^--/, "");
      }
      return this.short.replace(/^-/, "");
    }
    attributeName() {
      return camelcase(this.name().replace(/^no-/, ""));
    }
    is(arg) {
      return this.short === arg || this.long === arg;
    }
    isBoolean() {
      return !this.required && !this.optional && !this.negate;
    }
  }

  class DualOptions {
    constructor(options) {
      this.positiveOptions = new Map;
      this.negativeOptions = new Map;
      this.dualOptions = new Set;
      options.forEach((option) => {
        if (option.negate) {
          this.negativeOptions.set(option.attributeName(), option);
        } else {
          this.positiveOptions.set(option.attributeName(), option);
        }
      });
      this.negativeOptions.forEach((value, key) => {
        if (this.positiveOptions.has(key)) {
          this.dualOptions.add(key);
        }
      });
    }
    valueFromOption(value, option) {
      const optionKey = option.attributeName();
      if (!this.dualOptions.has(optionKey))
        return true;
      const preset = this.negativeOptions.get(optionKey).presetArg;
      const negativeValue = preset !== undefined ? preset : false;
      return option.negate === (negativeValue === value);
    }
  }
  function camelcase(str) {
    return str.split("-").reduce((str2, word) => {
      return str2 + word[0].toUpperCase() + word.slice(1);
    });
  }
  function splitOptionFlags(flags) {
    let shortFlag;
    let longFlag;
    const flagParts = flags.split(/[ |,]+/);
    if (flagParts.length > 1 && !/^[[<]/.test(flagParts[1]))
      shortFlag = flagParts.shift();
    longFlag = flagParts.shift();
    if (!shortFlag && /^-[^-]$/.test(longFlag)) {
      shortFlag = longFlag;
      longFlag = undefined;
    }
    return { shortFlag, longFlag };
  }
  exports.Option = Option;
  exports.DualOptions = DualOptions;
});

// node_modules/commander/lib/suggestSimilar.js
var require_suggestSimilar = __commonJS((exports) => {
  var maxDistance = 3;
  function editDistance(a, b) {
    if (Math.abs(a.length - b.length) > maxDistance)
      return Math.max(a.length, b.length);
    const d = [];
    for (let i = 0;i <= a.length; i++) {
      d[i] = [i];
    }
    for (let j = 0;j <= b.length; j++) {
      d[0][j] = j;
    }
    for (let j = 1;j <= b.length; j++) {
      for (let i = 1;i <= a.length; i++) {
        let cost = 1;
        if (a[i - 1] === b[j - 1]) {
          cost = 0;
        } else {
          cost = 1;
        }
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
        }
      }
    }
    return d[a.length][b.length];
  }
  function suggestSimilar(word, candidates) {
    if (!candidates || candidates.length === 0)
      return "";
    candidates = Array.from(new Set(candidates));
    const searchingOptions = word.startsWith("--");
    if (searchingOptions) {
      word = word.slice(2);
      candidates = candidates.map((candidate) => candidate.slice(2));
    }
    let similar = [];
    let bestDistance = maxDistance;
    const minSimilarity = 0.4;
    candidates.forEach((candidate) => {
      if (candidate.length <= 1)
        return;
      const distance = editDistance(word, candidate);
      const length = Math.max(word.length, candidate.length);
      const similarity = (length - distance) / length;
      if (similarity > minSimilarity) {
        if (distance < bestDistance) {
          bestDistance = distance;
          similar = [candidate];
        } else if (distance === bestDistance) {
          similar.push(candidate);
        }
      }
    });
    similar.sort((a, b) => a.localeCompare(b));
    if (searchingOptions) {
      similar = similar.map((candidate) => `--${candidate}`);
    }
    if (similar.length > 1) {
      return `
(Did you mean one of ${similar.join(", ")}?)`;
    }
    if (similar.length === 1) {
      return `
(Did you mean ${similar[0]}?)`;
    }
    return "";
  }
  exports.suggestSimilar = suggestSimilar;
});

// node_modules/commander/lib/command.js
var require_command = __commonJS((exports) => {
  var EventEmitter = __require("events").EventEmitter;
  var childProcess = __require("child_process");
  var path = __require("path");
  var fs = __require("fs");
  var process2 = __require("process");
  var { Argument, humanReadableArgName } = require_argument();
  var { CommanderError } = require_error();
  var { Help } = require_help();
  var { Option, DualOptions } = require_option();
  var { suggestSimilar } = require_suggestSimilar();

  class Command extends EventEmitter {
    constructor(name) {
      super();
      this.commands = [];
      this.options = [];
      this.parent = null;
      this._allowUnknownOption = false;
      this._allowExcessArguments = true;
      this.registeredArguments = [];
      this._args = this.registeredArguments;
      this.args = [];
      this.rawArgs = [];
      this.processedArgs = [];
      this._scriptPath = null;
      this._name = name || "";
      this._optionValues = {};
      this._optionValueSources = {};
      this._storeOptionsAsProperties = false;
      this._actionHandler = null;
      this._executableHandler = false;
      this._executableFile = null;
      this._executableDir = null;
      this._defaultCommandName = null;
      this._exitCallback = null;
      this._aliases = [];
      this._combineFlagAndOptionalValue = true;
      this._description = "";
      this._summary = "";
      this._argsDescription = undefined;
      this._enablePositionalOptions = false;
      this._passThroughOptions = false;
      this._lifeCycleHooks = {};
      this._showHelpAfterError = false;
      this._showSuggestionAfterError = true;
      this._outputConfiguration = {
        writeOut: (str) => process2.stdout.write(str),
        writeErr: (str) => process2.stderr.write(str),
        getOutHelpWidth: () => process2.stdout.isTTY ? process2.stdout.columns : undefined,
        getErrHelpWidth: () => process2.stderr.isTTY ? process2.stderr.columns : undefined,
        outputError: (str, write) => write(str)
      };
      this._hidden = false;
      this._helpOption = undefined;
      this._addImplicitHelpCommand = undefined;
      this._helpCommand = undefined;
      this._helpConfiguration = {};
    }
    copyInheritedSettings(sourceCommand) {
      this._outputConfiguration = sourceCommand._outputConfiguration;
      this._helpOption = sourceCommand._helpOption;
      this._helpCommand = sourceCommand._helpCommand;
      this._helpConfiguration = sourceCommand._helpConfiguration;
      this._exitCallback = sourceCommand._exitCallback;
      this._storeOptionsAsProperties = sourceCommand._storeOptionsAsProperties;
      this._combineFlagAndOptionalValue = sourceCommand._combineFlagAndOptionalValue;
      this._allowExcessArguments = sourceCommand._allowExcessArguments;
      this._enablePositionalOptions = sourceCommand._enablePositionalOptions;
      this._showHelpAfterError = sourceCommand._showHelpAfterError;
      this._showSuggestionAfterError = sourceCommand._showSuggestionAfterError;
      return this;
    }
    _getCommandAndAncestors() {
      const result = [];
      for (let command = this;command; command = command.parent) {
        result.push(command);
      }
      return result;
    }
    command(nameAndArgs, actionOptsOrExecDesc, execOpts) {
      let desc = actionOptsOrExecDesc;
      let opts = execOpts;
      if (typeof desc === "object" && desc !== null) {
        opts = desc;
        desc = null;
      }
      opts = opts || {};
      const [, name, args] = nameAndArgs.match(/([^ ]+) *(.*)/);
      const cmd = this.createCommand(name);
      if (desc) {
        cmd.description(desc);
        cmd._executableHandler = true;
      }
      if (opts.isDefault)
        this._defaultCommandName = cmd._name;
      cmd._hidden = !!(opts.noHelp || opts.hidden);
      cmd._executableFile = opts.executableFile || null;
      if (args)
        cmd.arguments(args);
      this._registerCommand(cmd);
      cmd.parent = this;
      cmd.copyInheritedSettings(this);
      if (desc)
        return this;
      return cmd;
    }
    createCommand(name) {
      return new Command(name);
    }
    createHelp() {
      return Object.assign(new Help, this.configureHelp());
    }
    configureHelp(configuration) {
      if (configuration === undefined)
        return this._helpConfiguration;
      this._helpConfiguration = configuration;
      return this;
    }
    configureOutput(configuration) {
      if (configuration === undefined)
        return this._outputConfiguration;
      Object.assign(this._outputConfiguration, configuration);
      return this;
    }
    showHelpAfterError(displayHelp = true) {
      if (typeof displayHelp !== "string")
        displayHelp = !!displayHelp;
      this._showHelpAfterError = displayHelp;
      return this;
    }
    showSuggestionAfterError(displaySuggestion = true) {
      this._showSuggestionAfterError = !!displaySuggestion;
      return this;
    }
    addCommand(cmd, opts) {
      if (!cmd._name) {
        throw new Error(`Command passed to .addCommand() must have a name
- specify the name in Command constructor or using .name()`);
      }
      opts = opts || {};
      if (opts.isDefault)
        this._defaultCommandName = cmd._name;
      if (opts.noHelp || opts.hidden)
        cmd._hidden = true;
      this._registerCommand(cmd);
      cmd.parent = this;
      cmd._checkForBrokenPassThrough();
      return this;
    }
    createArgument(name, description) {
      return new Argument(name, description);
    }
    argument(name, description, fn, defaultValue) {
      const argument = this.createArgument(name, description);
      if (typeof fn === "function") {
        argument.default(defaultValue).argParser(fn);
      } else {
        argument.default(fn);
      }
      this.addArgument(argument);
      return this;
    }
    arguments(names) {
      names.trim().split(/ +/).forEach((detail) => {
        this.argument(detail);
      });
      return this;
    }
    addArgument(argument) {
      const previousArgument = this.registeredArguments.slice(-1)[0];
      if (previousArgument && previousArgument.variadic) {
        throw new Error(`only the last argument can be variadic '${previousArgument.name()}'`);
      }
      if (argument.required && argument.defaultValue !== undefined && argument.parseArg === undefined) {
        throw new Error(`a default value for a required argument is never used: '${argument.name()}'`);
      }
      this.registeredArguments.push(argument);
      return this;
    }
    helpCommand(enableOrNameAndArgs, description) {
      if (typeof enableOrNameAndArgs === "boolean") {
        this._addImplicitHelpCommand = enableOrNameAndArgs;
        return this;
      }
      enableOrNameAndArgs = enableOrNameAndArgs ?? "help [command]";
      const [, helpName, helpArgs] = enableOrNameAndArgs.match(/([^ ]+) *(.*)/);
      const helpDescription = description ?? "display help for command";
      const helpCommand = this.createCommand(helpName);
      helpCommand.helpOption(false);
      if (helpArgs)
        helpCommand.arguments(helpArgs);
      if (helpDescription)
        helpCommand.description(helpDescription);
      this._addImplicitHelpCommand = true;
      this._helpCommand = helpCommand;
      return this;
    }
    addHelpCommand(helpCommand, deprecatedDescription) {
      if (typeof helpCommand !== "object") {
        this.helpCommand(helpCommand, deprecatedDescription);
        return this;
      }
      this._addImplicitHelpCommand = true;
      this._helpCommand = helpCommand;
      return this;
    }
    _getHelpCommand() {
      const hasImplicitHelpCommand = this._addImplicitHelpCommand ?? (this.commands.length && !this._actionHandler && !this._findCommand("help"));
      if (hasImplicitHelpCommand) {
        if (this._helpCommand === undefined) {
          this.helpCommand(undefined, undefined);
        }
        return this._helpCommand;
      }
      return null;
    }
    hook(event, listener) {
      const allowedValues = ["preSubcommand", "preAction", "postAction"];
      if (!allowedValues.includes(event)) {
        throw new Error(`Unexpected value for event passed to hook : '${event}'.
Expecting one of '${allowedValues.join("', '")}'`);
      }
      if (this._lifeCycleHooks[event]) {
        this._lifeCycleHooks[event].push(listener);
      } else {
        this._lifeCycleHooks[event] = [listener];
      }
      return this;
    }
    exitOverride(fn) {
      if (fn) {
        this._exitCallback = fn;
      } else {
        this._exitCallback = (err) => {
          if (err.code !== "commander.executeSubCommandAsync") {
            throw err;
          } else {}
        };
      }
      return this;
    }
    _exit(exitCode, code, message) {
      if (this._exitCallback) {
        this._exitCallback(new CommanderError(exitCode, code, message));
      }
      process2.exit(exitCode);
    }
    action(fn) {
      const listener = (args) => {
        const expectedArgsCount = this.registeredArguments.length;
        const actionArgs = args.slice(0, expectedArgsCount);
        if (this._storeOptionsAsProperties) {
          actionArgs[expectedArgsCount] = this;
        } else {
          actionArgs[expectedArgsCount] = this.opts();
        }
        actionArgs.push(this);
        return fn.apply(this, actionArgs);
      };
      this._actionHandler = listener;
      return this;
    }
    createOption(flags, description) {
      return new Option(flags, description);
    }
    _callParseArg(target, value, previous, invalidArgumentMessage) {
      try {
        return target.parseArg(value, previous);
      } catch (err) {
        if (err.code === "commander.invalidArgument") {
          const message = `${invalidArgumentMessage} ${err.message}`;
          this.error(message, { exitCode: err.exitCode, code: err.code });
        }
        throw err;
      }
    }
    _registerOption(option) {
      const matchingOption = option.short && this._findOption(option.short) || option.long && this._findOption(option.long);
      if (matchingOption) {
        const matchingFlag = option.long && this._findOption(option.long) ? option.long : option.short;
        throw new Error(`Cannot add option '${option.flags}'${this._name && ` to command '${this._name}'`} due to conflicting flag '${matchingFlag}'
-  already used by option '${matchingOption.flags}'`);
      }
      this.options.push(option);
    }
    _registerCommand(command) {
      const knownBy = (cmd) => {
        return [cmd.name()].concat(cmd.aliases());
      };
      const alreadyUsed = knownBy(command).find((name) => this._findCommand(name));
      if (alreadyUsed) {
        const existingCmd = knownBy(this._findCommand(alreadyUsed)).join("|");
        const newCmd = knownBy(command).join("|");
        throw new Error(`cannot add command '${newCmd}' as already have command '${existingCmd}'`);
      }
      this.commands.push(command);
    }
    addOption(option) {
      this._registerOption(option);
      const oname = option.name();
      const name = option.attributeName();
      if (option.negate) {
        const positiveLongFlag = option.long.replace(/^--no-/, "--");
        if (!this._findOption(positiveLongFlag)) {
          this.setOptionValueWithSource(name, option.defaultValue === undefined ? true : option.defaultValue, "default");
        }
      } else if (option.defaultValue !== undefined) {
        this.setOptionValueWithSource(name, option.defaultValue, "default");
      }
      const handleOptionValue = (val, invalidValueMessage, valueSource) => {
        if (val == null && option.presetArg !== undefined) {
          val = option.presetArg;
        }
        const oldValue = this.getOptionValue(name);
        if (val !== null && option.parseArg) {
          val = this._callParseArg(option, val, oldValue, invalidValueMessage);
        } else if (val !== null && option.variadic) {
          val = option._concatValue(val, oldValue);
        }
        if (val == null) {
          if (option.negate) {
            val = false;
          } else if (option.isBoolean() || option.optional) {
            val = true;
          } else {
            val = "";
          }
        }
        this.setOptionValueWithSource(name, val, valueSource);
      };
      this.on("option:" + oname, (val) => {
        const invalidValueMessage = `error: option '${option.flags}' argument '${val}' is invalid.`;
        handleOptionValue(val, invalidValueMessage, "cli");
      });
      if (option.envVar) {
        this.on("optionEnv:" + oname, (val) => {
          const invalidValueMessage = `error: option '${option.flags}' value '${val}' from env '${option.envVar}' is invalid.`;
          handleOptionValue(val, invalidValueMessage, "env");
        });
      }
      return this;
    }
    _optionEx(config, flags, description, fn, defaultValue) {
      if (typeof flags === "object" && flags instanceof Option) {
        throw new Error("To add an Option object use addOption() instead of option() or requiredOption()");
      }
      const option = this.createOption(flags, description);
      option.makeOptionMandatory(!!config.mandatory);
      if (typeof fn === "function") {
        option.default(defaultValue).argParser(fn);
      } else if (fn instanceof RegExp) {
        const regex = fn;
        fn = (val, def) => {
          const m = regex.exec(val);
          return m ? m[0] : def;
        };
        option.default(defaultValue).argParser(fn);
      } else {
        option.default(fn);
      }
      return this.addOption(option);
    }
    option(flags, description, parseArg, defaultValue) {
      return this._optionEx({}, flags, description, parseArg, defaultValue);
    }
    requiredOption(flags, description, parseArg, defaultValue) {
      return this._optionEx({ mandatory: true }, flags, description, parseArg, defaultValue);
    }
    combineFlagAndOptionalValue(combine = true) {
      this._combineFlagAndOptionalValue = !!combine;
      return this;
    }
    allowUnknownOption(allowUnknown = true) {
      this._allowUnknownOption = !!allowUnknown;
      return this;
    }
    allowExcessArguments(allowExcess = true) {
      this._allowExcessArguments = !!allowExcess;
      return this;
    }
    enablePositionalOptions(positional = true) {
      this._enablePositionalOptions = !!positional;
      return this;
    }
    passThroughOptions(passThrough = true) {
      this._passThroughOptions = !!passThrough;
      this._checkForBrokenPassThrough();
      return this;
    }
    _checkForBrokenPassThrough() {
      if (this.parent && this._passThroughOptions && !this.parent._enablePositionalOptions) {
        throw new Error(`passThroughOptions cannot be used for '${this._name}' without turning on enablePositionalOptions for parent command(s)`);
      }
    }
    storeOptionsAsProperties(storeAsProperties = true) {
      if (this.options.length) {
        throw new Error("call .storeOptionsAsProperties() before adding options");
      }
      if (Object.keys(this._optionValues).length) {
        throw new Error("call .storeOptionsAsProperties() before setting option values");
      }
      this._storeOptionsAsProperties = !!storeAsProperties;
      return this;
    }
    getOptionValue(key) {
      if (this._storeOptionsAsProperties) {
        return this[key];
      }
      return this._optionValues[key];
    }
    setOptionValue(key, value) {
      return this.setOptionValueWithSource(key, value, undefined);
    }
    setOptionValueWithSource(key, value, source) {
      if (this._storeOptionsAsProperties) {
        this[key] = value;
      } else {
        this._optionValues[key] = value;
      }
      this._optionValueSources[key] = source;
      return this;
    }
    getOptionValueSource(key) {
      return this._optionValueSources[key];
    }
    getOptionValueSourceWithGlobals(key) {
      let source;
      this._getCommandAndAncestors().forEach((cmd) => {
        if (cmd.getOptionValueSource(key) !== undefined) {
          source = cmd.getOptionValueSource(key);
        }
      });
      return source;
    }
    _prepareUserArgs(argv, parseOptions) {
      if (argv !== undefined && !Array.isArray(argv)) {
        throw new Error("first parameter to parse must be array or undefined");
      }
      parseOptions = parseOptions || {};
      if (argv === undefined && parseOptions.from === undefined) {
        if (process2.versions?.electron) {
          parseOptions.from = "electron";
        }
        const execArgv = process2.execArgv ?? [];
        if (execArgv.includes("-e") || execArgv.includes("--eval") || execArgv.includes("-p") || execArgv.includes("--print")) {
          parseOptions.from = "eval";
        }
      }
      if (argv === undefined) {
        argv = process2.argv;
      }
      this.rawArgs = argv.slice();
      let userArgs;
      switch (parseOptions.from) {
        case undefined:
        case "node":
          this._scriptPath = argv[1];
          userArgs = argv.slice(2);
          break;
        case "electron":
          if (process2.defaultApp) {
            this._scriptPath = argv[1];
            userArgs = argv.slice(2);
          } else {
            userArgs = argv.slice(1);
          }
          break;
        case "user":
          userArgs = argv.slice(0);
          break;
        case "eval":
          userArgs = argv.slice(1);
          break;
        default:
          throw new Error(`unexpected parse option { from: '${parseOptions.from}' }`);
      }
      if (!this._name && this._scriptPath)
        this.nameFromFilename(this._scriptPath);
      this._name = this._name || "program";
      return userArgs;
    }
    parse(argv, parseOptions) {
      const userArgs = this._prepareUserArgs(argv, parseOptions);
      this._parseCommand([], userArgs);
      return this;
    }
    async parseAsync(argv, parseOptions) {
      const userArgs = this._prepareUserArgs(argv, parseOptions);
      await this._parseCommand([], userArgs);
      return this;
    }
    _executeSubCommand(subcommand, args) {
      args = args.slice();
      let launchWithNode = false;
      const sourceExt = [".js", ".ts", ".tsx", ".mjs", ".cjs"];
      function findFile(baseDir, baseName) {
        const localBin = path.resolve(baseDir, baseName);
        if (fs.existsSync(localBin))
          return localBin;
        if (sourceExt.includes(path.extname(baseName)))
          return;
        const foundExt = sourceExt.find((ext) => fs.existsSync(`${localBin}${ext}`));
        if (foundExt)
          return `${localBin}${foundExt}`;
        return;
      }
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      let executableFile = subcommand._executableFile || `${this._name}-${subcommand._name}`;
      let executableDir = this._executableDir || "";
      if (this._scriptPath) {
        let resolvedScriptPath;
        try {
          resolvedScriptPath = fs.realpathSync(this._scriptPath);
        } catch (err) {
          resolvedScriptPath = this._scriptPath;
        }
        executableDir = path.resolve(path.dirname(resolvedScriptPath), executableDir);
      }
      if (executableDir) {
        let localFile = findFile(executableDir, executableFile);
        if (!localFile && !subcommand._executableFile && this._scriptPath) {
          const legacyName = path.basename(this._scriptPath, path.extname(this._scriptPath));
          if (legacyName !== this._name) {
            localFile = findFile(executableDir, `${legacyName}-${subcommand._name}`);
          }
        }
        executableFile = localFile || executableFile;
      }
      launchWithNode = sourceExt.includes(path.extname(executableFile));
      let proc;
      if (process2.platform !== "win32") {
        if (launchWithNode) {
          args.unshift(executableFile);
          args = incrementNodeInspectorPort(process2.execArgv).concat(args);
          proc = childProcess.spawn(process2.argv[0], args, { stdio: "inherit" });
        } else {
          proc = childProcess.spawn(executableFile, args, { stdio: "inherit" });
        }
      } else {
        args.unshift(executableFile);
        args = incrementNodeInspectorPort(process2.execArgv).concat(args);
        proc = childProcess.spawn(process2.execPath, args, { stdio: "inherit" });
      }
      if (!proc.killed) {
        const signals = ["SIGUSR1", "SIGUSR2", "SIGTERM", "SIGINT", "SIGHUP"];
        signals.forEach((signal) => {
          process2.on(signal, () => {
            if (proc.killed === false && proc.exitCode === null) {
              proc.kill(signal);
            }
          });
        });
      }
      const exitCallback = this._exitCallback;
      proc.on("close", (code) => {
        code = code ?? 1;
        if (!exitCallback) {
          process2.exit(code);
        } else {
          exitCallback(new CommanderError(code, "commander.executeSubCommandAsync", "(close)"));
        }
      });
      proc.on("error", (err) => {
        if (err.code === "ENOENT") {
          const executableDirMessage = executableDir ? `searched for local subcommand relative to directory '${executableDir}'` : "no directory for search for local subcommand, use .executableDir() to supply a custom directory";
          const executableMissing = `'${executableFile}' does not exist
 - if '${subcommand._name}' is not meant to be an executable command, remove description parameter from '.command()' and use '.description()' instead
 - if the default executable name is not suitable, use the executableFile option to supply a custom name or path
 - ${executableDirMessage}`;
          throw new Error(executableMissing);
        } else if (err.code === "EACCES") {
          throw new Error(`'${executableFile}' not executable`);
        }
        if (!exitCallback) {
          process2.exit(1);
        } else {
          const wrappedError = new CommanderError(1, "commander.executeSubCommandAsync", "(error)");
          wrappedError.nestedError = err;
          exitCallback(wrappedError);
        }
      });
      this.runningCommand = proc;
    }
    _dispatchSubcommand(commandName, operands, unknown) {
      const subCommand = this._findCommand(commandName);
      if (!subCommand)
        this.help({ error: true });
      let promiseChain;
      promiseChain = this._chainOrCallSubCommandHook(promiseChain, subCommand, "preSubcommand");
      promiseChain = this._chainOrCall(promiseChain, () => {
        if (subCommand._executableHandler) {
          this._executeSubCommand(subCommand, operands.concat(unknown));
        } else {
          return subCommand._parseCommand(operands, unknown);
        }
      });
      return promiseChain;
    }
    _dispatchHelpCommand(subcommandName) {
      if (!subcommandName) {
        this.help();
      }
      const subCommand = this._findCommand(subcommandName);
      if (subCommand && !subCommand._executableHandler) {
        subCommand.help();
      }
      return this._dispatchSubcommand(subcommandName, [], [this._getHelpOption()?.long ?? this._getHelpOption()?.short ?? "--help"]);
    }
    _checkNumberOfArguments() {
      this.registeredArguments.forEach((arg, i) => {
        if (arg.required && this.args[i] == null) {
          this.missingArgument(arg.name());
        }
      });
      if (this.registeredArguments.length > 0 && this.registeredArguments[this.registeredArguments.length - 1].variadic) {
        return;
      }
      if (this.args.length > this.registeredArguments.length) {
        this._excessArguments(this.args);
      }
    }
    _processArguments() {
      const myParseArg = (argument, value, previous) => {
        let parsedValue = value;
        if (value !== null && argument.parseArg) {
          const invalidValueMessage = `error: command-argument value '${value}' is invalid for argument '${argument.name()}'.`;
          parsedValue = this._callParseArg(argument, value, previous, invalidValueMessage);
        }
        return parsedValue;
      };
      this._checkNumberOfArguments();
      const processedArgs = [];
      this.registeredArguments.forEach((declaredArg, index) => {
        let value = declaredArg.defaultValue;
        if (declaredArg.variadic) {
          if (index < this.args.length) {
            value = this.args.slice(index);
            if (declaredArg.parseArg) {
              value = value.reduce((processed, v) => {
                return myParseArg(declaredArg, v, processed);
              }, declaredArg.defaultValue);
            }
          } else if (value === undefined) {
            value = [];
          }
        } else if (index < this.args.length) {
          value = this.args[index];
          if (declaredArg.parseArg) {
            value = myParseArg(declaredArg, value, declaredArg.defaultValue);
          }
        }
        processedArgs[index] = value;
      });
      this.processedArgs = processedArgs;
    }
    _chainOrCall(promise, fn) {
      if (promise && promise.then && typeof promise.then === "function") {
        return promise.then(() => fn());
      }
      return fn();
    }
    _chainOrCallHooks(promise, event) {
      let result = promise;
      const hooks = [];
      this._getCommandAndAncestors().reverse().filter((cmd) => cmd._lifeCycleHooks[event] !== undefined).forEach((hookedCommand) => {
        hookedCommand._lifeCycleHooks[event].forEach((callback) => {
          hooks.push({ hookedCommand, callback });
        });
      });
      if (event === "postAction") {
        hooks.reverse();
      }
      hooks.forEach((hookDetail) => {
        result = this._chainOrCall(result, () => {
          return hookDetail.callback(hookDetail.hookedCommand, this);
        });
      });
      return result;
    }
    _chainOrCallSubCommandHook(promise, subCommand, event) {
      let result = promise;
      if (this._lifeCycleHooks[event] !== undefined) {
        this._lifeCycleHooks[event].forEach((hook) => {
          result = this._chainOrCall(result, () => {
            return hook(this, subCommand);
          });
        });
      }
      return result;
    }
    _parseCommand(operands, unknown) {
      const parsed = this.parseOptions(unknown);
      this._parseOptionsEnv();
      this._parseOptionsImplied();
      operands = operands.concat(parsed.operands);
      unknown = parsed.unknown;
      this.args = operands.concat(unknown);
      if (operands && this._findCommand(operands[0])) {
        return this._dispatchSubcommand(operands[0], operands.slice(1), unknown);
      }
      if (this._getHelpCommand() && operands[0] === this._getHelpCommand().name()) {
        return this._dispatchHelpCommand(operands[1]);
      }
      if (this._defaultCommandName) {
        this._outputHelpIfRequested(unknown);
        return this._dispatchSubcommand(this._defaultCommandName, operands, unknown);
      }
      if (this.commands.length && this.args.length === 0 && !this._actionHandler && !this._defaultCommandName) {
        this.help({ error: true });
      }
      this._outputHelpIfRequested(parsed.unknown);
      this._checkForMissingMandatoryOptions();
      this._checkForConflictingOptions();
      const checkForUnknownOptions = () => {
        if (parsed.unknown.length > 0) {
          this.unknownOption(parsed.unknown[0]);
        }
      };
      const commandEvent = `command:${this.name()}`;
      if (this._actionHandler) {
        checkForUnknownOptions();
        this._processArguments();
        let promiseChain;
        promiseChain = this._chainOrCallHooks(promiseChain, "preAction");
        promiseChain = this._chainOrCall(promiseChain, () => this._actionHandler(this.processedArgs));
        if (this.parent) {
          promiseChain = this._chainOrCall(promiseChain, () => {
            this.parent.emit(commandEvent, operands, unknown);
          });
        }
        promiseChain = this._chainOrCallHooks(promiseChain, "postAction");
        return promiseChain;
      }
      if (this.parent && this.parent.listenerCount(commandEvent)) {
        checkForUnknownOptions();
        this._processArguments();
        this.parent.emit(commandEvent, operands, unknown);
      } else if (operands.length) {
        if (this._findCommand("*")) {
          return this._dispatchSubcommand("*", operands, unknown);
        }
        if (this.listenerCount("command:*")) {
          this.emit("command:*", operands, unknown);
        } else if (this.commands.length) {
          this.unknownCommand();
        } else {
          checkForUnknownOptions();
          this._processArguments();
        }
      } else if (this.commands.length) {
        checkForUnknownOptions();
        this.help({ error: true });
      } else {
        checkForUnknownOptions();
        this._processArguments();
      }
    }
    _findCommand(name) {
      if (!name)
        return;
      return this.commands.find((cmd) => cmd._name === name || cmd._aliases.includes(name));
    }
    _findOption(arg) {
      return this.options.find((option) => option.is(arg));
    }
    _checkForMissingMandatoryOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd.options.forEach((anOption) => {
          if (anOption.mandatory && cmd.getOptionValue(anOption.attributeName()) === undefined) {
            cmd.missingMandatoryOptionValue(anOption);
          }
        });
      });
    }
    _checkForConflictingLocalOptions() {
      const definedNonDefaultOptions = this.options.filter((option) => {
        const optionKey = option.attributeName();
        if (this.getOptionValue(optionKey) === undefined) {
          return false;
        }
        return this.getOptionValueSource(optionKey) !== "default";
      });
      const optionsWithConflicting = definedNonDefaultOptions.filter((option) => option.conflictsWith.length > 0);
      optionsWithConflicting.forEach((option) => {
        const conflictingAndDefined = definedNonDefaultOptions.find((defined) => option.conflictsWith.includes(defined.attributeName()));
        if (conflictingAndDefined) {
          this._conflictingOption(option, conflictingAndDefined);
        }
      });
    }
    _checkForConflictingOptions() {
      this._getCommandAndAncestors().forEach((cmd) => {
        cmd._checkForConflictingLocalOptions();
      });
    }
    parseOptions(argv) {
      const operands = [];
      const unknown = [];
      let dest = operands;
      const args = argv.slice();
      function maybeOption(arg) {
        return arg.length > 1 && arg[0] === "-";
      }
      let activeVariadicOption = null;
      while (args.length) {
        const arg = args.shift();
        if (arg === "--") {
          if (dest === unknown)
            dest.push(arg);
          dest.push(...args);
          break;
        }
        if (activeVariadicOption && !maybeOption(arg)) {
          this.emit(`option:${activeVariadicOption.name()}`, arg);
          continue;
        }
        activeVariadicOption = null;
        if (maybeOption(arg)) {
          const option = this._findOption(arg);
          if (option) {
            if (option.required) {
              const value = args.shift();
              if (value === undefined)
                this.optionMissingArgument(option);
              this.emit(`option:${option.name()}`, value);
            } else if (option.optional) {
              let value = null;
              if (args.length > 0 && !maybeOption(args[0])) {
                value = args.shift();
              }
              this.emit(`option:${option.name()}`, value);
            } else {
              this.emit(`option:${option.name()}`);
            }
            activeVariadicOption = option.variadic ? option : null;
            continue;
          }
        }
        if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-") {
          const option = this._findOption(`-${arg[1]}`);
          if (option) {
            if (option.required || option.optional && this._combineFlagAndOptionalValue) {
              this.emit(`option:${option.name()}`, arg.slice(2));
            } else {
              this.emit(`option:${option.name()}`);
              args.unshift(`-${arg.slice(2)}`);
            }
            continue;
          }
        }
        if (/^--[^=]+=/.test(arg)) {
          const index = arg.indexOf("=");
          const option = this._findOption(arg.slice(0, index));
          if (option && (option.required || option.optional)) {
            this.emit(`option:${option.name()}`, arg.slice(index + 1));
            continue;
          }
        }
        if (maybeOption(arg)) {
          dest = unknown;
        }
        if ((this._enablePositionalOptions || this._passThroughOptions) && operands.length === 0 && unknown.length === 0) {
          if (this._findCommand(arg)) {
            operands.push(arg);
            if (args.length > 0)
              unknown.push(...args);
            break;
          } else if (this._getHelpCommand() && arg === this._getHelpCommand().name()) {
            operands.push(arg);
            if (args.length > 0)
              operands.push(...args);
            break;
          } else if (this._defaultCommandName) {
            unknown.push(arg);
            if (args.length > 0)
              unknown.push(...args);
            break;
          }
        }
        if (this._passThroughOptions) {
          dest.push(arg);
          if (args.length > 0)
            dest.push(...args);
          break;
        }
        dest.push(arg);
      }
      return { operands, unknown };
    }
    opts() {
      if (this._storeOptionsAsProperties) {
        const result = {};
        const len = this.options.length;
        for (let i = 0;i < len; i++) {
          const key = this.options[i].attributeName();
          result[key] = key === this._versionOptionName ? this._version : this[key];
        }
        return result;
      }
      return this._optionValues;
    }
    optsWithGlobals() {
      return this._getCommandAndAncestors().reduce((combinedOptions, cmd) => Object.assign(combinedOptions, cmd.opts()), {});
    }
    error(message, errorOptions) {
      this._outputConfiguration.outputError(`${message}
`, this._outputConfiguration.writeErr);
      if (typeof this._showHelpAfterError === "string") {
        this._outputConfiguration.writeErr(`${this._showHelpAfterError}
`);
      } else if (this._showHelpAfterError) {
        this._outputConfiguration.writeErr(`
`);
        this.outputHelp({ error: true });
      }
      const config = errorOptions || {};
      const exitCode = config.exitCode || 1;
      const code = config.code || "commander.error";
      this._exit(exitCode, code, message);
    }
    _parseOptionsEnv() {
      this.options.forEach((option) => {
        if (option.envVar && option.envVar in process2.env) {
          const optionKey = option.attributeName();
          if (this.getOptionValue(optionKey) === undefined || ["default", "config", "env"].includes(this.getOptionValueSource(optionKey))) {
            if (option.required || option.optional) {
              this.emit(`optionEnv:${option.name()}`, process2.env[option.envVar]);
            } else {
              this.emit(`optionEnv:${option.name()}`);
            }
          }
        }
      });
    }
    _parseOptionsImplied() {
      const dualHelper = new DualOptions(this.options);
      const hasCustomOptionValue = (optionKey) => {
        return this.getOptionValue(optionKey) !== undefined && !["default", "implied"].includes(this.getOptionValueSource(optionKey));
      };
      this.options.filter((option) => option.implied !== undefined && hasCustomOptionValue(option.attributeName()) && dualHelper.valueFromOption(this.getOptionValue(option.attributeName()), option)).forEach((option) => {
        Object.keys(option.implied).filter((impliedKey) => !hasCustomOptionValue(impliedKey)).forEach((impliedKey) => {
          this.setOptionValueWithSource(impliedKey, option.implied[impliedKey], "implied");
        });
      });
    }
    missingArgument(name) {
      const message = `error: missing required argument '${name}'`;
      this.error(message, { code: "commander.missingArgument" });
    }
    optionMissingArgument(option) {
      const message = `error: option '${option.flags}' argument missing`;
      this.error(message, { code: "commander.optionMissingArgument" });
    }
    missingMandatoryOptionValue(option) {
      const message = `error: required option '${option.flags}' not specified`;
      this.error(message, { code: "commander.missingMandatoryOptionValue" });
    }
    _conflictingOption(option, conflictingOption) {
      const findBestOptionFromValue = (option2) => {
        const optionKey = option2.attributeName();
        const optionValue = this.getOptionValue(optionKey);
        const negativeOption = this.options.find((target) => target.negate && optionKey === target.attributeName());
        const positiveOption = this.options.find((target) => !target.negate && optionKey === target.attributeName());
        if (negativeOption && (negativeOption.presetArg === undefined && optionValue === false || negativeOption.presetArg !== undefined && optionValue === negativeOption.presetArg)) {
          return negativeOption;
        }
        return positiveOption || option2;
      };
      const getErrorMessage = (option2) => {
        const bestOption = findBestOptionFromValue(option2);
        const optionKey = bestOption.attributeName();
        const source = this.getOptionValueSource(optionKey);
        if (source === "env") {
          return `environment variable '${bestOption.envVar}'`;
        }
        return `option '${bestOption.flags}'`;
      };
      const message = `error: ${getErrorMessage(option)} cannot be used with ${getErrorMessage(conflictingOption)}`;
      this.error(message, { code: "commander.conflictingOption" });
    }
    unknownOption(flag) {
      if (this._allowUnknownOption)
        return;
      let suggestion = "";
      if (flag.startsWith("--") && this._showSuggestionAfterError) {
        let candidateFlags = [];
        let command = this;
        do {
          const moreFlags = command.createHelp().visibleOptions(command).filter((option) => option.long).map((option) => option.long);
          candidateFlags = candidateFlags.concat(moreFlags);
          command = command.parent;
        } while (command && !command._enablePositionalOptions);
        suggestion = suggestSimilar(flag, candidateFlags);
      }
      const message = `error: unknown option '${flag}'${suggestion}`;
      this.error(message, { code: "commander.unknownOption" });
    }
    _excessArguments(receivedArgs) {
      if (this._allowExcessArguments)
        return;
      const expected = this.registeredArguments.length;
      const s = expected === 1 ? "" : "s";
      const forSubcommand = this.parent ? ` for '${this.name()}'` : "";
      const message = `error: too many arguments${forSubcommand}. Expected ${expected} argument${s} but got ${receivedArgs.length}.`;
      this.error(message, { code: "commander.excessArguments" });
    }
    unknownCommand() {
      const unknownName = this.args[0];
      let suggestion = "";
      if (this._showSuggestionAfterError) {
        const candidateNames = [];
        this.createHelp().visibleCommands(this).forEach((command) => {
          candidateNames.push(command.name());
          if (command.alias())
            candidateNames.push(command.alias());
        });
        suggestion = suggestSimilar(unknownName, candidateNames);
      }
      const message = `error: unknown command '${unknownName}'${suggestion}`;
      this.error(message, { code: "commander.unknownCommand" });
    }
    version(str, flags, description) {
      if (str === undefined)
        return this._version;
      this._version = str;
      flags = flags || "-V, --version";
      description = description || "output the version number";
      const versionOption = this.createOption(flags, description);
      this._versionOptionName = versionOption.attributeName();
      this._registerOption(versionOption);
      this.on("option:" + versionOption.name(), () => {
        this._outputConfiguration.writeOut(`${str}
`);
        this._exit(0, "commander.version", str);
      });
      return this;
    }
    description(str, argsDescription) {
      if (str === undefined && argsDescription === undefined)
        return this._description;
      this._description = str;
      if (argsDescription) {
        this._argsDescription = argsDescription;
      }
      return this;
    }
    summary(str) {
      if (str === undefined)
        return this._summary;
      this._summary = str;
      return this;
    }
    alias(alias) {
      if (alias === undefined)
        return this._aliases[0];
      let command = this;
      if (this.commands.length !== 0 && this.commands[this.commands.length - 1]._executableHandler) {
        command = this.commands[this.commands.length - 1];
      }
      if (alias === command._name)
        throw new Error("Command alias can't be the same as its name");
      const matchingCommand = this.parent?._findCommand(alias);
      if (matchingCommand) {
        const existingCmd = [matchingCommand.name()].concat(matchingCommand.aliases()).join("|");
        throw new Error(`cannot add alias '${alias}' to command '${this.name()}' as already have command '${existingCmd}'`);
      }
      command._aliases.push(alias);
      return this;
    }
    aliases(aliases) {
      if (aliases === undefined)
        return this._aliases;
      aliases.forEach((alias) => this.alias(alias));
      return this;
    }
    usage(str) {
      if (str === undefined) {
        if (this._usage)
          return this._usage;
        const args = this.registeredArguments.map((arg) => {
          return humanReadableArgName(arg);
        });
        return [].concat(this.options.length || this._helpOption !== null ? "[options]" : [], this.commands.length ? "[command]" : [], this.registeredArguments.length ? args : []).join(" ");
      }
      this._usage = str;
      return this;
    }
    name(str) {
      if (str === undefined)
        return this._name;
      this._name = str;
      return this;
    }
    nameFromFilename(filename) {
      this._name = path.basename(filename, path.extname(filename));
      return this;
    }
    executableDir(path2) {
      if (path2 === undefined)
        return this._executableDir;
      this._executableDir = path2;
      return this;
    }
    helpInformation(contextOptions) {
      const helper = this.createHelp();
      if (helper.helpWidth === undefined) {
        helper.helpWidth = contextOptions && contextOptions.error ? this._outputConfiguration.getErrHelpWidth() : this._outputConfiguration.getOutHelpWidth();
      }
      return helper.formatHelp(this, helper);
    }
    _getHelpContext(contextOptions) {
      contextOptions = contextOptions || {};
      const context = { error: !!contextOptions.error };
      let write;
      if (context.error) {
        write = (arg) => this._outputConfiguration.writeErr(arg);
      } else {
        write = (arg) => this._outputConfiguration.writeOut(arg);
      }
      context.write = contextOptions.write || write;
      context.command = this;
      return context;
    }
    outputHelp(contextOptions) {
      let deprecatedCallback;
      if (typeof contextOptions === "function") {
        deprecatedCallback = contextOptions;
        contextOptions = undefined;
      }
      const context = this._getHelpContext(contextOptions);
      this._getCommandAndAncestors().reverse().forEach((command) => command.emit("beforeAllHelp", context));
      this.emit("beforeHelp", context);
      let helpInformation = this.helpInformation(context);
      if (deprecatedCallback) {
        helpInformation = deprecatedCallback(helpInformation);
        if (typeof helpInformation !== "string" && !Buffer.isBuffer(helpInformation)) {
          throw new Error("outputHelp callback must return a string or a Buffer");
        }
      }
      context.write(helpInformation);
      if (this._getHelpOption()?.long) {
        this.emit(this._getHelpOption().long);
      }
      this.emit("afterHelp", context);
      this._getCommandAndAncestors().forEach((command) => command.emit("afterAllHelp", context));
    }
    helpOption(flags, description) {
      if (typeof flags === "boolean") {
        if (flags) {
          this._helpOption = this._helpOption ?? undefined;
        } else {
          this._helpOption = null;
        }
        return this;
      }
      flags = flags ?? "-h, --help";
      description = description ?? "display help for command";
      this._helpOption = this.createOption(flags, description);
      return this;
    }
    _getHelpOption() {
      if (this._helpOption === undefined) {
        this.helpOption(undefined, undefined);
      }
      return this._helpOption;
    }
    addHelpOption(option) {
      this._helpOption = option;
      return this;
    }
    help(contextOptions) {
      this.outputHelp(contextOptions);
      let exitCode = process2.exitCode || 0;
      if (exitCode === 0 && contextOptions && typeof contextOptions !== "function" && contextOptions.error) {
        exitCode = 1;
      }
      this._exit(exitCode, "commander.help", "(outputHelp)");
    }
    addHelpText(position, text) {
      const allowedValues = ["beforeAll", "before", "after", "afterAll"];
      if (!allowedValues.includes(position)) {
        throw new Error(`Unexpected value for position to addHelpText.
Expecting one of '${allowedValues.join("', '")}'`);
      }
      const helpEvent = `${position}Help`;
      this.on(helpEvent, (context) => {
        let helpStr;
        if (typeof text === "function") {
          helpStr = text({ error: context.error, command: context.command });
        } else {
          helpStr = text;
        }
        if (helpStr) {
          context.write(`${helpStr}
`);
        }
      });
      return this;
    }
    _outputHelpIfRequested(args) {
      const helpOption = this._getHelpOption();
      const helpRequested = helpOption && args.find((arg) => helpOption.is(arg));
      if (helpRequested) {
        this.outputHelp();
        this._exit(0, "commander.helpDisplayed", "(outputHelp)");
      }
    }
  }
  function incrementNodeInspectorPort(args) {
    return args.map((arg) => {
      if (!arg.startsWith("--inspect")) {
        return arg;
      }
      let debugOption;
      let debugHost = "127.0.0.1";
      let debugPort = "9229";
      let match;
      if ((match = arg.match(/^(--inspect(-brk)?)$/)) !== null) {
        debugOption = match[1];
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+)$/)) !== null) {
        debugOption = match[1];
        if (/^\d+$/.test(match[3])) {
          debugPort = match[3];
        } else {
          debugHost = match[3];
        }
      } else if ((match = arg.match(/^(--inspect(-brk|-port)?)=([^:]+):(\d+)$/)) !== null) {
        debugOption = match[1];
        debugHost = match[3];
        debugPort = match[4];
      }
      if (debugOption && debugPort !== "0") {
        return `${debugOption}=${debugHost}:${parseInt(debugPort) + 1}`;
      }
      return arg;
    });
  }
  exports.Command = Command;
});

// node_modules/commander/index.js
var require_commander = __commonJS((exports) => {
  var { Argument } = require_argument();
  var { Command } = require_command();
  var { CommanderError, InvalidArgumentError } = require_error();
  var { Help } = require_help();
  var { Option } = require_option();
  exports.program = new Command;
  exports.createCommand = (name) => new Command(name);
  exports.createOption = (flags, description) => new Option(flags, description);
  exports.createArgument = (name, description) => new Argument(name, description);
  exports.Command = Command;
  exports.Option = Option;
  exports.Argument = Argument;
  exports.Help = Help;
  exports.CommanderError = CommanderError;
  exports.InvalidArgumentError = InvalidArgumentError;
  exports.InvalidOptionArgumentError = InvalidArgumentError;
});

// node_modules/commander/esm.mjs
var import__ = __toESM(require_commander(), 1);
var {
  program,
  createCommand,
  createArgument,
  createOption,
  CommanderError,
  InvalidArgumentError,
  InvalidOptionArgumentError,
  Command,
  Argument,
  Option,
  Help
} = import__.default;

// src/index.ts
import { promises as fs10 } from "fs";
import path7 from "path";

// src/types.ts
var VModelState;
((VModelState2) => {
  VModelState2["REQUIREMENTS"] = "REQUIREMENTS";
  VModelState2["SYSTEM_DESIGN"] = "SYSTEM_DESIGN";
  VModelState2["ARCH_DESIGN"] = "ARCH_DESIGN";
  VModelState2["MODULE_DESIGN"] = "MODULE_DESIGN";
  VModelState2["IMPLEMENTATION"] = "IMPLEMENTATION";
  VModelState2["UNIT_TEST"] = "UNIT_TEST";
  VModelState2["INTEGRATION_TEST"] = "INTEGRATION_TEST";
  VModelState2["SYSTEM_TEST"] = "SYSTEM_TEST";
  VModelState2["ACCEPTANCE_TEST"] = "ACCEPTANCE_TEST";
  VModelState2["PROTOTYPING"] = "PROTOTYPING";
  VModelState2["WAITING_FOR_USER"] = "WAITING_FOR_USER";
  VModelState2["CONSOLIDATING"] = "CONSOLIDATING";
  VModelState2["COMPLETE"] = "COMPLETE";
  VModelState2["BLOCKED"] = "BLOCKED";
  VModelState2["DESIGN_REVIEW"] = "DESIGN_REVIEW";
  VModelState2["REVIEWING"] = "REVIEWING";
  VModelState2["ARCHIVING"] = "ARCHIVING";
  VModelState2["PIVOTING"] = "PIVOTING";
  VModelState2["REFLECTING"] = "REFLECTING";
})(VModelState ||= {});

class VModelError extends Error {
  exitCode;
  recoverable;
  constructor(message, exitCode = 1, recoverable = false) {
    super(message);
    this.exitCode = exitCode;
    this.recoverable = recoverable;
    this.name = "VModelError";
  }
}
function isValidState(state) {
  return Object.values(VModelState).includes(state);
}

// src/config.ts
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
var __filename2 = fileURLToPath(import.meta.url);
var SCRIPT_DIR = path.dirname(__filename2);
async function detectProjectDirectory(explicitProjectDir) {
  if (explicitProjectDir) {
    if (!existsSync(explicitProjectDir)) {
      throw new Error(`Project directory not found: ${explicitProjectDir}`);
    }
    return path.resolve(explicitProjectDir);
  }
  const dirName = path.basename(SCRIPT_DIR);
  if (dirName === "ai-v-model") {
    const parentDir2 = path.dirname(SCRIPT_DIR);
    if (existsSync(path.join(parentDir2, ".git"))) {
      return parentDir2;
    }
    return parentDir2;
  }
  if (dirName === "src") {
    const aiVModelDir = path.dirname(SCRIPT_DIR);
    const parentDir2 = path.dirname(aiVModelDir);
    if (existsSync(path.join(parentDir2, ".git"))) {
      return parentDir2;
    }
    return parentDir2;
  }
  const cwd = process.cwd();
  if (existsSync(path.join(cwd, ".git"))) {
    return cwd;
  }
  const parentDir = path.dirname(cwd);
  if (existsSync(path.join(parentDir, ".git"))) {
    return parentDir;
  }
  console.warn("Could not detect project directory, using current directory");
  return cwd;
}
async function loadConfigFile(configPath) {
  const candidates = configPath ? [configPath] : [
    path.join(process.cwd(), ".v-modelrc"),
    path.join(process.env.HOME || "", ".v-modelrc")
  ];
  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        const content = await Bun.file(candidate).text();
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn(`Failed to load config from ${candidate}:`, error);
    }
  }
  return {};
}
function mergeConfig(cliArgs, envVars, configFile, defaults) {
  return {
    ...defaults,
    ...configFile,
    ...envVars,
    ...cliArgs
  };
}
function parseEnvironmentVars() {
  const env = {};
  if (process.env.AI_PROVIDER === "claude" || process.env.AI_PROVIDER === "gemini") {
    env.aiProvider = process.env.AI_PROVIDER;
  }
  if (process.env.MAX_ITERATIONS) {
    env.maxIterations = parseInt(process.env.MAX_ITERATIONS, 10);
  }
  if (process.env.CPU_THRESHOLD) {
    env.cpuThreshold = parseInt(process.env.CPU_THRESHOLD, 10);
  }
  if (process.env.LATENCY_THRESHOLD) {
    env.latencyThreshold = parseInt(process.env.LATENCY_THRESHOLD, 10);
  }
  if (process.env.CONSULT_GEMINI === "true" || process.env.CONSULT_GEMINI === "false") {
    env.consultGemini = process.env.CONSULT_GEMINI === "true";
  }
  if (process.env.VERBOSE === "true") {
    env.verbose = true;
  }
  return env;
}
var defaultConfig = {
  aiProvider: "claude",
  maxIterations: 100,
  cpuThreshold: 80,
  latencyThreshold: 100,
  consultGemini: true,
  projectDir: "",
  verbose: false,
  noPush: false,
  commitInterval: 1
};
var config;
async function initializeConfig(cliArgs = {}, configFilePath) {
  const projectDir = await detectProjectDirectory(cliArgs.projectDir);
  cliArgs.projectDir = projectDir;
  const configFile = await loadConfigFile(configFilePath);
  const envVars = parseEnvironmentVars();
  config = mergeConfig(cliArgs, envVars, configFile, defaultConfig);
  return config;
}

// src/logger.ts
var COLORS = {
  reset: "\x1B[0m",
  red: "\x1B[0;31m",
  green: "\x1B[0;32m",
  yellow: "\x1B[1;33m",
  blue: "\x1B[0;34m",
  purple: "\x1B[0;35m",
  cyan: "\x1B[0;36m",
  gray: "\x1B[0;90m"
};
function logInfo(message) {
  console.error(`${COLORS.blue}[INFO]${COLORS.reset} ${message}`);
}
function logSuccess(message) {
  console.error(`${COLORS.green}[SUCCESS]${COLORS.reset} ${message}`);
}
function logWarning(message) {
  console.error(`${COLORS.yellow}[WARNING]${COLORS.reset} ${message}`);
}
function logError(message) {
  console.error(`${COLORS.red}[ERROR]${COLORS.reset} ${message}`);
}
function logPhase(message) {
  console.error(`${COLORS.purple}[PHASE]${COLORS.reset} ${message}`);
}
function logState(message) {
  console.error(`${COLORS.cyan}[STATE]${COLORS.reset} ${message}`);
}
function logDebug(message) {
  if (config?.verbose) {
    console.error(`${COLORS.gray}[DEBUG]${COLORS.reset} ${message}`);
  }
}

// src/journey.ts
import { promises as fs3 } from "fs";
import path2 from "path";

// src/file-utils.ts
import { promises as fs, existsSync as existsSync2 } from "fs";
function stripAnsi(text) {
  return text.replace(/\x1b\[[0-9;]*m/g, "");
}
async function sedInplace(file, pattern, replacement) {
  const content = await fs.readFile(file, "utf-8");
  const regex = typeof pattern === "string" ? new RegExp(pattern, "g") : pattern;
  const updated = content.replace(regex, replacement);
  await fs.writeFile(file, updated);
}
async function insertAfterLine(file, lineNum, text) {
  const content = await fs.readFile(file, "utf-8");
  const lines = content.split(`
`);
  lines.splice(lineNum, 0, text);
  await fs.writeFile(file, lines.join(`
`));
}
async function appendToFile(file, content) {
  const cleanContent = stripAnsi(content);
  await fs.appendFile(file, cleanContent);
}
async function findLineNumber(file, pattern) {
  const content = await fs.readFile(file, "utf-8");
  const lines = content.split(`
`);
  for (let i = 0;i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      return i + 1;
    }
  }
  return -1;
}

// src/journey-reader.ts
import { promises as fs2 } from "fs";
var journeyCache = new Map;
var CACHE_TTL = 5000;
async function readJourneyFile(journeyFile) {
  const now = Date.now();
  const cached = journeyCache.get(journeyFile);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }
  const content = await fs2.readFile(journeyFile, "utf-8");
  journeyCache.set(journeyFile, { content, timestamp: now });
  return content;
}
async function getJourneyField(journeyFile, field) {
  const content = await readJourneyFile(journeyFile);
  const match = content.match(new RegExp(`^- ${field}:\\s*(.+)$`, "m"));
  return match ? match[1].trim() : "";
}

// src/journey.ts
function getJourneyPath(name) {
  const journeyDir = path2.join(config.projectDir, "v_model", "journey");
  return path2.join(journeyDir, `${name}.journey.md`);
}
function getJourneyDir() {
  return path2.join(config.projectDir, "v_model", "journey");
}
function sanitizeJourneyName(goal) {
  return goal.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").substring(0, 50);
}
async function createJourneyFile(goal) {
  const name = sanitizeJourneyName(goal);
  const journeyPath = getJourneyPath(name);
  await fs3.mkdir(getJourneyDir(), { recursive: true });
  try {
    await fs3.access(journeyPath);
    throw new Error(`Journey already exists: ${name}`);
  } catch {}
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
  const journeyTemplate = `# Journey: ${goal}

## Meta

- Goal: ${goal}
- State: REQUIREMENTS
- Previous Phase: TBD
- Previous State: TBD
- Current Epic: TBD
- Started: ${timestamp}
- Current Approach: TBD
- Progress: 0%

## Approaches

### Approach 1: TBD

- Status: PENDING
- Reason: TBD
- Iterations: 0

## Current Approach Detail

### Approach 1: TBD

- Hypothesis: TBD
- Milestones:
  - [ ] Research and identify viable approaches

## Guardrails

- [PENDING] All baseline tests must pass (no regression)
- [PENDING] Build must succeed after each commit

## Baseline Metrics

| Metric            | Baseline | Current | Threshold   |
| ----------------- | -------- | ------- | ----------- |
| CPU Usage         | TBD      | TBD     | +${config.cpuThreshold}% |
| Latency           | TBD      | TBD     | +${config.latencyThreshold}ms |
| Test Pass Rate    | TBD      | TBD     | No decrease |

## User Hints

*(No user hints yet)*

## Research Notes

*(Research findings documented during design phases)*

### REQUIREMENTS Phase Research
*(To be populated)*

### SYSTEM_DESIGN Phase Research
*(To be populated)*

### ARCH_DESIGN Phase Research
*(To be populated)*

### MODULE_DESIGN Phase Research
*(To be populated)*

## Epic Progress

| Epic ID | Name             | Status      | Stories Complete | Total Stories |
| ------- | ---------------- | ----------- | ---------------- | ------------- |
| TBD     | TBD              | PENDING     | 0                | TBD           |

*(Epic progress will be tracked during SYSTEM_DESIGN phase)*

## Design Spec

*(Design spec will be created during REQUIREMENTS phase)*

## Generated Artifacts

*(No artifacts yet)*

## Learnings Log

*(Learnings will be added as the journey progresses)*

## Dead Ends

*(Dead ends and failed approaches will be documented here)*

## Anti-Patterns

*(Anti-patterns to avoid will be documented here)*

## Pending Questions

*(No pending questions)*

## Checkpoints

| ID | Tag                | Date       | Description |
| -- | ------------------ | ---------- | ----------- |
`;
  await fs3.writeFile(journeyPath, journeyTemplate);
  return journeyPath;
}
async function getJourneyState(journeyFile) {
  try {
    const content = await readJourneyFile(journeyFile);
    const match = content.match(/^- State:\s*(\w+)$/m);
    if (match) {
      const state = match[1].toUpperCase();
      if (isValidState(state)) {
        return state;
      }
      logWarning(`Unrecognized state: ${state}, defaulting to REQUIREMENTS`);
    }
    logWarning("State field missing from journey file, assuming REQUIREMENTS");
    return "REQUIREMENTS" /* REQUIREMENTS */;
  } catch (error) {
    throw new Error(`Failed to read journey state: ${error}`);
  }
}
async function setJourneyState(journeyFile, state) {
  await sedInplace(journeyFile, /^- State: .*$/m, `- State: ${state}`);
}
async function getJourneyGoal(journeyFile) {
  const goal = await getJourneyField(journeyFile, "Goal");
  return goal || "";
}
async function getJourneyProgress(journeyFile) {
  const progressStr = await getJourneyField(journeyFile, "Progress");
  const match = progressStr.match(/^(\d+)%$/);
  return match ? parseInt(match[1], 10) : 0;
}
async function getCurrentApproach(journeyFile) {
  const approach = await getJourneyField(journeyFile, "Current Approach");
  return approach || "TBD";
}
async function getCurrentEpic(journeyFile) {
  const epic = await getJourneyField(journeyFile, "Current Epic");
  return epic || "TBD";
}
async function setCurrentEpic(journeyFile, epic) {
  await sedInplace(journeyFile, /^- Current Epic: .*$/m, `- Current Epic: ${epic}`);
}
async function getPreviousPhase(journeyFile) {
  const phase = await getJourneyField(journeyFile, "Previous Phase");
  return phase || "TBD";
}
async function getPreviousState(journeyFile) {
  const state = await getJourneyField(journeyFile, "Previous State");
  return state || "BLOCKED";
}
async function setPreviousState(journeyFile, state) {
  const content = await readJourneyFile(journeyFile);
  if (content.match(/^- Previous State:/m)) {
    await sedInplace(journeyFile, /^- Previous State: .*$/m, `- Previous State: ${state}`);
  } else {
    const lineNum = await findLineNumber(journeyFile, /^- Previous Phase:$/m);
    if (lineNum > 0) {
      await insertAfterLine(journeyFile, lineNum, `- Previous State: ${state}`);
    }
  }
}
async function findActiveJourney() {
  const journeyDir = getJourneyDir();
  try {
    const files = await fs3.readdir(journeyDir);
    const journeys = files.filter((f) => f.endsWith(".journey.md")).map((f) => path2.join(journeyDir, f));
    const journeysWithStats = await Promise.all(journeys.map(async (j) => ({
      path: j,
      mtime: (await fs3.stat(j)).mtime.getTime()
    })));
    journeysWithStats.sort((a, b) => b.mtime - a.mtime);
    for (const journey of journeysWithStats) {
      const state = await getJourneyState(journey.path);
      if (state !== "COMPLETE" /* COMPLETE */) {
        return journey.path;
      }
    }
  } catch {}
  return null;
}
async function listJourneys() {
  const journeyDir = getJourneyDir();
  const journeys = [];
  try {
    const files = await fs3.readdir(journeyDir);
    const journeyFiles = files.filter((f) => f.endsWith(".journey.md"));
    for (const file of journeyFiles) {
      const journeyPath = path2.join(journeyDir, file);
      const goal = await getJourneyGoal(journeyPath);
      const state = await getJourneyState(journeyPath);
      const progress = await getJourneyProgress(journeyPath);
      const currentEpic = await getCurrentEpic(journeyPath);
      const previousPhase = await getPreviousPhase(journeyPath);
      const previousState = await getPreviousState(journeyPath);
      const currentApproach = await getCurrentApproach(journeyPath);
      const started = await getJourneyField(journeyPath, "Started");
      journeys.push({
        goal,
        state,
        progress,
        currentEpic,
        previousPhase,
        previousState,
        started,
        currentApproach
      });
    }
  } catch {}
  return journeys;
}
async function addLearning(journeyFile, learning) {
  const timestamp = new Date().toISOString().split("T")[0];
  const cleanLearning = stripAnsi(learning);
  await appendToFile(journeyFile, `
- ${timestamp}: ${cleanLearning}`);
}
async function addUserHint(journeyFile, hint) {
  const cleanHint = stripAnsi(hint);
  await appendToFile(journeyFile, `
- ${new Date().toISOString().split("T")[0]}: ${cleanHint}`);
}

// src/main-loop.ts
import { promises as fs9 } from "fs";
import path6 from "path";

// src/design-spec.ts
import { promises as fs4, existsSync as existsSync3 } from "fs";
import path3 from "path";
function getDesignSpecPath(journeyName) {
  const journeyDir = path3.join(config.projectDir, "v_model", "journey");
  return path3.join(journeyDir, `${journeyName}.spec.md`);
}
function getDesignSpecPathFromJourney(journeyFile) {
  const journeyName = path3.basename(journeyFile, ".journey.md");
  return getDesignSpecPath(journeyName);
}
async function extractDesignContent(journeyFile, phase) {
  if (phase === "ARCH_DESIGN" /* ARCH_DESIGN */ || phase === "MODULE_DESIGN" /* MODULE_DESIGN */) {
    const currentEpic = await getCurrentEpic(journeyFile);
    if (currentEpic && currentEpic !== "TBD") {
      const epicNum = currentEpic.replace(/\D/g, "");
      const journeyDir = path3.dirname(journeyFile);
      const journeyName = path3.basename(journeyFile, ".journey.md");
      const epicFilePath = path3.join(journeyDir, `${journeyName}.journey.E${epicNum}.md`);
      if (existsSync3(epicFilePath)) {
        const epicContent = await fs4.readFile(epicFilePath, "utf-8");
        if (phase === "ARCH_DESIGN" /* ARCH_DESIGN */) {
          const epicDecompMatch = epicContent.match(/## Epic Decomposition\n([\s\S]+?)\n(?=##)/);
          if (epicDecompMatch) {
            return epicDecompMatch[1].trim();
          }
        } else if (phase === "MODULE_DESIGN" /* MODULE_DESIGN */) {
          const storyMatch = epicContent.match(/### Story S\d+:.*?\n([\s\S]+?)(?=### Story|\n##)/);
          if (storyMatch) {
            return storyMatch[1].trim();
          }
        }
      }
    }
  }
  const specPath = getDesignSpecPathFromJourney(journeyFile);
  let content = "";
  switch (phase) {
    case "REQUIREMENTS" /* REQUIREMENTS */:
      if (existsSync3(specPath)) {
        const specContent = await fs4.readFile(specPath, "utf-8");
        const userReqMatch = specContent.match(/## User Requirements\n([\s\S]+?)\n## /);
        const sysReqMatch = specContent.match(/## System Requirements\n([\s\S]+?)\n## /);
        content = (userReqMatch?.[1] || "") + `

` + (sysReqMatch?.[1] || "");
      }
      break;
    case "SYSTEM_DESIGN" /* SYSTEM_DESIGN */:
      if (existsSync3(specPath)) {
        const specContent = await fs4.readFile(specPath, "utf-8");
        const epicsMatch = specContent.match(/## Epics\n([\s\S]+?)\n## /);
        const archMatch = specContent.match(/## Architecture\n([\s\S]+?)\n## /);
        content = (epicsMatch?.[1] || "") + `

` + (archMatch?.[1] || "");
      }
      break;
    case "ARCH_DESIGN" /* ARCH_DESIGN */:
    case "MODULE_DESIGN" /* MODULE_DESIGN */: {
      const journeyContent = await readJourneyFile(journeyFile);
      const epicMatch = journeyContent.match(/## Current Epic\n([\s\S]+?)\n## /);
      const storyMatch = journeyContent.match(/## Current Story\n([\s\S]+?)\n## /);
      content = epicMatch?.[1] || storyMatch?.[1] || "";
      break;
    }
  }
  if (!content.trim()) {
    content = await readJourneyFile(journeyFile);
  }
  return content;
}
async function extractResearchContent(journeyFile, phase) {
  if (phase === "ARCH_DESIGN" /* ARCH_DESIGN */ || phase === "MODULE_DESIGN" /* MODULE_DESIGN */) {
    const currentEpic = await getCurrentEpic(journeyFile);
    if (currentEpic && currentEpic !== "TBD") {
      const epicNum = currentEpic.replace(/\D/g, "");
      const journeyDir = path3.dirname(journeyFile);
      const journeyName = path3.basename(journeyFile, ".journey.md");
      const epicFilePath = path3.join(journeyDir, `${journeyName}.journey.E${epicNum}.md`);
      if (existsSync3(epicFilePath)) {
        const epicContent = await fs4.readFile(epicFilePath, "utf-8");
        const sectionPattern2 = phase === "ARCH_DESIGN" /* ARCH_DESIGN */ ? /### ARCH_DESIGN Phase Research\n([\s\S]+?)\n(?=##)/ : /### MODULE_DESIGN Phase Research\n([\s\S]+?)\n(?=##)/;
        const researchMatch2 = epicContent.match(sectionPattern2);
        if (researchMatch2 && !researchMatch2[1].includes("To be populated")) {
          return researchMatch2[1].trim();
        }
      }
    }
  }
  const journeyContent = await readJourneyFile(journeyFile);
  const sectionPattern = `### ${phase} Phase Research`;
  const researchMatch = journeyContent.match(new RegExp(`${sectionPattern}\\n([\\s\\S]+?)\\n### `));
  if (!researchMatch) {
    return "";
  }
  if (researchMatch[1].includes("To be populated")) {
    return "";
  }
  return researchMatch[1].trim();
}

// src/prompts/main-iteration.ts
var MAIN_ITERATION_HEADER = `You are an autonomous R&D agent working toward a high-level goal using a V-Model workflow.
Refer to v_model.md for the Master Protocol.

AI Provider: {{AI_PROVIDER}}

## Your Journey

{{JOURNEY_CONTENT}}

{{EPIC_FILE_INSTRUCTIONS}}

{{EPIC_CONTENT}}

## Your Task: V-Model Phase Execution

**IMPORTANT: When transitioning to DESIGN_REVIEW, always update the "Previous Phase:" field in the Meta section to reflect the phase you just completed.**

Format: In the Meta section at the top of the journey file, update the line:
\`- Previous Phase: REQUIREMENTS\`
to match the phase you just completed (REQUIREMENTS, SYSTEM_DESIGN, ARCH_DESIGN, or MODULE_DESIGN).

**CRITICAL: Always check the "## User Hints" section in the journey file and incorporate ALL user feedback into your design.** User hints represent explicit requirements or preferences that MUST be followed.

Based on the current journey state, perform the appropriate phase:

### Research Phase (Part of Each Design Phase)

Before finalizing any design, conduct research:

**For complex research questions, use parallel explore agents:**
1. Identify 2-3 distinct research areas (e.g., existing implementations, external research, memory patterns)
2. Launch Explore agents IN PARALLEL (single message, multiple tool calls)
3. Each agent focuses on one area and reports back
4. You consolidate findings into Research Notes

**For simple research, proceed sequentially:**
1. **Web Search** (if applicable):
   - Search for existing libraries that solve this problem
   - Look for best practices, design patterns, anti-patterns
   - Use the WebSearch tool with current year (2026)

2. **Gemini Rubber Duck** (optional, use for complex decisions):
   - Use Gemini to "talk through" your design reasoning
   - Ask: "What are the tradeoffs between X and Y?"
   - Ask: "What edge cases might I be missing?"
   - Command: \`echo "your question" | gemini --yolo\`

3. **Codebase Research**:
   - Search for existing implementations of similar functionality
   - Check memory.md for anti-patterns and successful patterns
   - Review test_data/ for relevant test cases

4. **Document Findings**:
   - Add key findings to journey file under "## Research Notes"
   - Cite sources (URLs, file paths, memory entries)

**IMPORTANT**: When working on an epic, write research notes to the epic file, not journey.md:
- ARCH_DESIGN research \u2192 epic file's "### ARCH_DESIGN Phase Research" section
- MODULE_DESIGN research \u2192 epic file's "### MODULE_DESIGN Phase Research" section

**Journey-level research** (affects entire journey) still goes to journey.md:
- REQUIREMENTS phase research
- SYSTEM_DESIGN phase research

### Parallel Agent Orchestration (For Complex Tasks)

When dealing with complex research or implementation, you can spawn multiple sub-agents:

**During Research Phase:**
- Launch up to 3 Explore agents IN PARALLEL with different focus areas:
  - Agent 1: Existing implementations in codebase
  - Agent 2: External research (web search, best practices)
  - Agent 3: Memory patterns and anti-patterns
- Each agent reports back findings
- You consolidate findings into Research Notes

**During Planning/Design:**
- Structure your plan as discrete, independent tasks
- Each task should have clear inputs and outputs
- Include dependency information (which tasks must complete first)

**At Implementation Time:**
- If tasks are independent, note: "These can be executed in parallel by sub-agents"
- If tasks have dependencies, note: "Execute A before B, then C and D can run in parallel"
- The orchestrator (you or loop_v_model.sh) will handle delegation
`;
var REQUIREMENTS_PHASE = `### If REQUIREMENTS:
- **Execute Spec Initiation Protocol** (see v_model.md).
- **RESEARCH**: Before finalizing requirements:
  - Web search for similar systems/libraries
  - Consult memory.md for past learnings
  - Use Gemini rubber duck for complex tradeoffs
- Document research in "## Research Notes > ### REQUIREMENTS Phase Research"
- If the spec file does not exist, you MUST ask the user clarifying questions to establish goals, metrics, and constraints.
- Create or update \`{journey_name}.spec.md\` with User Requirements, System Requirements, and Acceptance Criteria.
- **Transition to WAITING_FOR_USER** if you need the user to sign off on requirements.
- Once signed off, update the Meta section: change "- Previous Phase: TBD" to "- Previous Phase: REQUIREMENTS", then transition to DESIGN_REVIEW.

### If DESIGN_REVIEW:
- This is an automatic state - do NOT write any content.
- The system will consult Gemini for design review (including research quality).
- Wait for the system to process the review result.

### If SYSTEM_DESIGN:
- **RESEARCH**: Before finalizing architecture:
  - Web search for architectural patterns for the domain
  - Search codebase for similar implementations
  - Use Gemini rubber duck: "What architectural tradeoffs exist?"
- Document research in "## Research Notes > ### SYSTEM_DESIGN Phase Research"
- Define the high-level architecture.
- Decompose the goal into **Epics**.
- Update the Design Spec with the architecture and Epics list.
- Update the Meta section: change "- Previous Phase: REQUIREMENTS" to "- Previous Phase: SYSTEM_DESIGN", then transition to DESIGN_REVIEW.

### If ARCH_DESIGN:
- **RESEARCH**: Before finalizing component design:
  - Search for existing interfaces/APIs in codebase
  - Web search for component design patterns
  - Use Gemini rubber duck for interface decisions
- **Write all story designs to the epic file** (not journey.md):
  - Epic Decomposition section with story names, descriptions, dependencies
  - Initial Implementation Progress table
- **Write epic-specific research to epic file's Research Notes section**
- Update journey.md with brief summary:
  \`\`\`markdown
  ### Epic E{N}: {Epic Name}
  **Status**: IN_PROGRESS
  **Stories**: {N} stories planned
  **Details**: See \`{journey}.journey.E{N}.md\`
  \`\`\`
- Update the Meta section: change "- Previous Phase: SYSTEM_DESIGN" to "- Previous Phase: ARCH_DESIGN", then transition to DESIGN_REVIEW for the first Story.

### If MODULE_DESIGN:
- **RESEARCH**: Before finalizing module design:
  - Search codebase for similar functions/classes
  - Web search for algorithm implementations
  - Use Gemini rubber duck for edge cases
- **Write detailed story design to the epic file** (add to story's section):
  - Technical details: signatures, state changes, error handling
- **Write story-specific research to epic file's Research Notes > MODULE_DESIGN section**
- **Update epic file's Implementation Progress table**:
  - Set Story phase to current V-Model phase (e.g., "MODULE_DESIGN")
  - Set Status to IN_PROGRESS when working, COMPLETE when done
  - Add test results after UNIT_TEST/INTEGRATION_TEST
- Perform a Design Review. If passed, update the Meta section: change "- Previous Phase: ARCH_DESIGN" to "- Previous Phase: MODULE_DESIGN", then transition to DESIGN_REVIEW.

**Implementation Progress Table Updates** - Update at these trigger points:
- After completing each story design: Set Phase to "MODULE_DESIGN", Status to "IN_PROGRESS"
- After passing DESIGN_REVIEW: Set Phase to "IMPLEMENTATION"
- After passing UNIT_TEST: Set Tests to "PASS" with count
- After passing INTEGRATION_TEST: Set Status to "COMPLETE", move to next story
`;
var IMPLEMENTATION_PHASES = `### If PROTOTYPING (Optional):
- Use Python/C++ to validate complex algorithms before production implementation.
- If successful, transition back to MODULE_DESIGN or IMPLEMENTATION.

### If IMPLEMENTATION:
- Code exactly one Story based on the approved MODULE_DESIGN.
- **If the Story decomposes into independent sub-tasks:**
  - Document each sub-task with clear inputs/outputs
  - Mark which can be executed in parallel
  - Example format:
    \`\`\`
    ## Implementation Plan
    - [ ] Sub-task A (can run in parallel)
    - [ ] Sub-task B (can run in parallel)
    - [ ] Sub-task C (depends on A and B)
    \`\`\`
- **If the Story is simple/unitary:** Implement directly
- Run basic guardrails (build).
- Transition to UNIT_TEST.

### If UNIT_TEST:
- Run tests specific to the module/story.
- Analyze logs and edge cases.
- If fails, transition back to MODULE_DESIGN.
- If passes, transition to INTEGRATION_TEST.

### If INTEGRATION_TEST:
- Run system-wide tests (all_tests).
- Verify the new module interacts correctly with existing components.
- If fails, transition back to ARCH_DESIGN.
- If passes, check if this was the last story in the current epic:
  - If yes, mark the current Epic as COMPLETE in the Learnings Log with format: "**Epic E# (Epic Name) COMPLETED**. All N stories implemented with X tests passing."
  - Check if there are more epics defined in the epic decomposition section.
  - If yes, transition to WAITING_FOR_USER (which will auto-transition to the next epic's ARCH_DESIGN).
  - If no, transition to SYSTEM_TEST.
- If this was not the last story in the current epic, transition back to MODULE_DESIGN for the next story.

### If SYSTEM_TEST:
- Verify the entire system against the **System Requirements** in the Spec.
- Check performance metrics (CPU, latency).
- If fails, transition back to SYSTEM_DESIGN.
- If passes, transition to ACCEPTANCE_TEST.

### If ACCEPTANCE_TEST:
- Verify against the **User Requirements** and final **Acceptance Criteria**.
- If everything passes, transition to CONSOLIDATING.
- If fails, transition back to REQUIREMENTS.

### If WAITING_FOR_USER:
- Write clear questions to \`## Pending Questions\`.
- Wait for user \`hint\` or sign-off.

### If CONSOLIDATING:
- Cleanup, document, and finalize the Design Spec.
- Transition to COMPLETE.
`;
var IMPORTANT_RULES = `## Important Rules
- Follow the V-Model: If a verification stage fails, move back to the *corresponding* design stage.
- One Story per IMPLEMENTATION cycle.
- Document every state change in the Learnings Log.
- **Checkbox Management**: When an Epic or major milestone is completed, update relevant checkboxes in the journey file:
  - Mark completed items as \`[x]\`
  - Mark items that won't be done as \`[-]\` with brief explanation
  - Keep checkboxes in sync with actual progress (e.g., milestones, guardrails, acceptance criteria)

**Learnings** - Distinguish between epic-specific and journey-level:

**Epic-specific learnings** \u2192 epic file's "## Learnings" section:
- Mention the epic name (e.g., "E1: Authentication")
- Mention specific story names (e.g., "S2: Login Form")
- Contain epic-specific implementation details or patterns
- Apply primarily to this epic's context

**Journey-level learnings** \u2192 journey.md's "## Learnings Log":
- Apply across multiple epics (e.g., "always use X pattern for Y")
- Cross-cutting concerns (e.g., "API design philosophy")
- Anti-patterns discovered that affect the whole journey
- Architectural decisions that impact future epics

**When unsure**: Default to journey.md Learnings Log (it's better to preserve cross-epic context)
`;
function renderMainIterationHeader(vars) {
  return MAIN_ITERATION_HEADER.replace("{{AI_PROVIDER}}", vars.AI_PROVIDER).replace("{{JOURNEY_CONTENT}}", vars.JOURNEY_CONTENT).replace("{{EPIC_FILE_INSTRUCTIONS}}", vars.EPIC_FILE_INSTRUCTIONS || "").replace("{{EPIC_CONTENT}}", vars.EPIC_CONTENT || "");
}
function mainIterationPrompt(vars) {
  return renderMainIterationHeader(vars) + REQUIREMENTS_PHASE + IMPLEMENTATION_PHASES + IMPORTANT_RULES;
}
// src/prompts/gemini-review.ts
var GEMINI_REVIEW_WITH_RESEARCH = `You are a design consultant reviewing a V-Model {{PHASE}} phase.

Evaluate BOTH the design AND the research that supports it.

Provide your review in this EXACT format:
---
DECISION: [APPROVED / ITERATE]
RESEARCH_QUALITY: [THOROUGH / ADEQUATE / INSUFFICIENT]
ISSUES:
- [issue 1, if any]
- [issue 2, if any]
RECOMMENDATIONS:
- [recommendation 1]
- [recommendation 2]
---

Design content to review:
{{DESIGN_CONTENT}}

Research Notes:
{{RESEARCH_CONTENT}}

Rules:
- APPROVED: Design is sound, minor suggestions only
- ITERATE: Major issues that must be addressed before proceeding
- THOROUGH: Good research coverage, multiple sources consulted
- ADEQUATE: Basic research done, some gaps acceptable
- INSUFFICIENT: Must do more research before proceeding
`;
var GEMINI_REVIEW_NO_RESEARCH = `You are a design consultant reviewing a V-Model {{PHASE}} phase.

Provide your review in this EXACT format:
---
DECISION: [APPROVED / ITERATE]
RESEARCH_QUALITY: [NOT_APPLICABLE]
ISSUES:
- [issue 1, if any]
RECOMMENDATIONS:
- [recommendation 1]
---

Design content to review:
{{DESIGN_CONTENT}}

Rules:
- APPROVED: Design is sound, minor suggestions only
- ITERATE: Major issues that must be addressed before proceeding

Note: No research notes were provided for this phase.
`;
function geminiReviewPrompt(vars, hasResearch) {
  const template = hasResearch ? GEMINI_REVIEW_WITH_RESEARCH : GEMINI_REVIEW_NO_RESEARCH;
  return template.replace(/{{PHASE}}/g, vars.PHASE).replace(/{{DESIGN_CONTENT}}/g, vars.DESIGN_CONTENT).replace(/{{RESEARCH_CONTENT}}/g, vars.RESEARCH_CONTENT || "");
}
// src/ai-provider.ts
import { spawn } from "child_process";
import { promises as fs5 } from "fs";
var childProcesses = [];
async function detectClaudeCapabilities() {
  return new Promise((resolve) => {
    const proc = spawn("claude", ["--version"], {
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", () => {
      const versionMatch = stdout.match(/version (\d+\.\d+\.\d+)/i);
      const version = versionMatch ? versionMatch[1] : "unknown";
      const hasPrint = stdout.includes("--print") || stderr.includes("--print");
      const hasStreamJson = stdout.includes("stream-json") || stderr.includes("stream-json");
      const hasVerbose = stdout.includes("--verbose") || stderr.includes("--verbose");
      resolve({
        hasPrint,
        hasStreamJson,
        hasVerbose,
        version
      });
    });
    proc.on("error", () => {
      resolve({
        hasPrint: false,
        hasStreamJson: false,
        hasVerbose: false,
        version: "not found"
      });
    });
  });
}
class StreamBuffer {
  buffer = "";
  add(chunk) {
    this.buffer += chunk;
  }
  tryExtract() {
    const lines = this.buffer.split(`
`);
    this.buffer = lines.pop() || "";
    for (const line of lines) {
      if (!line.trim())
        continue;
      try {
        return JSON.parse(line);
      } catch {
        continue;
      }
    }
    return null;
  }
  reset() {
    this.buffer = "";
  }
}
function parseStreamChunk(chunk) {
  const buffer = new StreamBuffer;
  buffer.add(chunk);
  const event = buffer.tryExtract();
  if (!event)
    return;
  switch (event.type) {
    case "content_block_start":
      if (event.content_block?.type === "tool_use") {
        process.stderr.write(`\x1B[36m[AI] \u2192 ${event.content_block.name}\x1B[0m`);
      }
      break;
    case "text_delta":
      if (event.delta?.type === "text_delta") {
        const cleanText = event.delta.text.replace(/\x1b\[[0-9;]*m/g, "");
        process.stderr.write(cleanText);
      }
      break;
    case "result":
      if (event.total_cost_usd !== undefined && event.num_turns !== undefined) {
        process.stderr.write(`
`);
        logDebug(`AI finished: ${event.num_turns} turn(s), $${event.total_cost_usd.toFixed(4)}`);
      }
      break;
  }
}
async function runAIWithPrompt(promptFile) {
  const isGemini = config.aiProvider === "gemini";
  const capabilities = isGemini ? null : await detectClaudeCapabilities();
  const aiCmd = isGemini ? ["gemini", "--yolo"] : ["claude"];
  if (!isGemini && capabilities) {
    if (capabilities.hasPrint) {
      aiCmd.push("--print");
    }
    if (config.verbose && capabilities.hasStreamJson && capabilities.hasVerbose) {
      aiCmd.push("--output-format", "stream-json");
      aiCmd.push("--include-partial-messages");
      aiCmd.push("--verbose");
    }
  }
  logDebug(`Running AI command: ${aiCmd.join(" ")}`);
  return new Promise((resolve, reject) => {
    const proc = spawn(aiCmd[0], aiCmd.slice(1), {
      stdio: ["pipe", "pipe", "pipe"]
    });
    childProcesses.push(proc);
    fs5.readFile(promptFile, "utf-8").then((prompt) => {
      proc.stdin?.write(prompt);
      proc.stdin?.end();
    }).catch((error) => {
      logDebug(`Failed to read prompt file: ${error}`);
      proc.kill();
      reject(error);
    });
    if (config.verbose && !isGemini && capabilities?.hasStreamJson && capabilities?.hasVerbose) {
      proc.stdout?.on("data", (chunk) => {
        const text = chunk.toString();
        parseStreamChunk(text);
      });
      proc.stderr?.on("data", (chunk) => {
        process.stderr.write(chunk);
      });
    } else {
      proc.stdout?.on("data", (chunk) => {
        process.stdout.write(chunk);
      });
      proc.stderr?.on("data", (chunk) => {
        process.stderr.write(chunk);
      });
    }
    proc.on("close", (code) => {
      const index = childProcesses.indexOf(proc);
      if (index > -1) {
        childProcesses.splice(index, 1);
      }
      resolve(code || 0);
    });
    proc.on("error", (error) => {
      const index = childProcesses.indexOf(proc);
      if (index > -1) {
        childProcesses.splice(index, 1);
      }
      reject(error);
    });
  });
}
async function consultGemini(phase, designContent, researchContent) {
  const hasResearch = Boolean(researchContent?.trim());
  const reviewPrompt = geminiReviewPrompt({
    PHASE: phase,
    DESIGN_CONTENT: designContent,
    RESEARCH_CONTENT: researchContent || ""
  }, hasResearch);
  const tempPrompt = `/tmp/v-model-gemini-review-${Date.now()}.md`;
  await fs5.writeFile(tempPrompt, reviewPrompt);
  try {
    const proc = spawn("gemini", ["--yolo"], {
      stdio: ["pipe", "pipe", "pipe"]
    });
    childProcesses.push(proc);
    proc.stdin?.write(reviewPrompt);
    proc.stdin?.end();
    let output = "";
    proc.stdout?.on("data", (chunk) => {
      output += chunk.toString();
    });
    proc.on("close", (_code) => {
      const index = childProcesses.indexOf(proc);
      if (index > -1) {
        childProcesses.splice(index, 1);
      }
    });
    await new Promise((resolve, reject) => {
      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Gemini exited with code ${code}`));
        }
      });
      proc.on("error", reject);
    });
    return output;
  } finally {
    try {
      await fs5.unlink(tempPrompt);
    } catch {}
  }
}
function killAllChildProcesses() {
  for (const proc of childProcesses) {
    try {
      proc.kill();
    } catch {}
  }
  childProcesses.length = 0;
}

// src/epic-archival.ts
import { promises as fs6, existsSync as existsSync4 } from "fs";
import path4 from "path";
function getEpicFilePath(journeyFile, epicNum) {
  const journeyDir = path4.dirname(journeyFile);
  const journeyName = path4.basename(journeyFile, ".journey.md");
  const sanitizedJourneyName = sanitizeJourneyName(journeyName);
  return path4.join(journeyDir, `${sanitizedJourneyName}.journey.E${epicNum}.md`);
}
async function createOrUpdateEpicFile(journeyFile, epicNum, epicName) {
  const epicFilePath = getEpicFilePath(journeyFile, epicNum);
  const journeyName = path4.basename(journeyFile, ".journey.md");
  if (existsSync4(epicFilePath)) {
    logInfo(`Epic file exists, will update: ${epicFilePath}`);
    return epicFilePath;
  }
  logInfo(`Creating new epic file: ${epicFilePath}`);
  const timestamp = new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";
  const epicTemplate = `# Epic E${epicNum}: ${epicName}

> **Journey**: ${journeyName}
> **Created**: ${timestamp}
> **Status**: IN_PROGRESS

## Epic Summary
{Brief description of what this epic accomplishes}

## Epic Decomposition

### Story S1: {Story Name}
**Status**: PENDING
**Description**: {What this story does}
**Dependencies**: {None or other stories}

### Story S2: {Story Name}
...

## Research Notes

### ARCH_DESIGN Phase Research
{Component-level research, API/interface designs}

### MODULE_DESIGN Phase Research
{Algorithm research, edge cases, implementation details}

## Implementation Progress
| Story | Phase | Status | Tests | Notes |
|-------|-------|--------|-------|-------|
| S1 | MODULE_DESIGN | IN_PROGRESS | - | Working on detailed design |
| S2 | PENDING | PENDING | - | Not started |

## Learnings
{Epic-specific learnings added during work}

## Dead Ends (if any)
{Anti-patterns or approaches that didn't work}
`;
  await fs6.writeFile(epicFilePath, epicTemplate);
  logSuccess(`Created epic file: ${epicFilePath}`);
  return epicFilePath;
}
async function extractEpicProgressTable(journeyFile) {
  const content = await fs6.readFile(journeyFile, "utf-8");
  const epicProgressMatch = content.match(/## Epic Progress\n([\s\S]+?)\n## /);
  if (!epicProgressMatch) {
    return "";
  }
  const epicProgressSection = epicProgressMatch[1];
  const epicRows = epicProgressSection.split(`
`).filter((line) => line.match(/^\| E\d+ /)).join(`
`);
  return epicRows;
}
async function getCompletedUnarchivedEpics(journeyFile) {
  const journeyDir = path4.dirname(journeyFile);
  const journeyName = path4.basename(journeyFile, ".journey.md");
  const currentEpic = await getCurrentEpic(journeyFile);
  const currentEpicNum = parseInt(currentEpic.replace(/\D/g, ""), 10) || 0;
  const epicProgressTable = await extractEpicProgressTable(journeyFile);
  const completedUnarchivedEpics = [];
  for (const line of epicProgressTable.split(`
`)) {
    const match = line.match(/^\| E(\d+) \| (.+?) \| (\w+) /);
    if (!match)
      continue;
    const [, epicNumStr, _epicName, epicStatus] = match;
    const epicNum = parseInt(epicNumStr, 10);
    if (epicStatus !== "COMPLETE")
      continue;
    if (epicNum === currentEpicNum)
      continue;
    const epicFilePath = path4.join(journeyDir, `${sanitizeJourneyName(journeyName)}.journey.E${epicNum}.md`);
    if (existsSync4(epicFilePath))
      continue;
    completedUnarchivedEpics.push(epicNum);
  }
  return completedUnarchivedEpics;
}
async function markEpicComplete(journeyFile, epicNum) {
  const epicFilePath = getEpicFilePath(journeyFile, epicNum);
  const currentDate = new Date().toISOString().split("T")[0];
  logInfo(`Marking Epic E${epicNum} as COMPLETE...`);
  const epicContent = await fs6.readFile(epicFilePath, "utf-8");
  const updatedEpicContent = epicContent.replace(/^(> \*\*Status\*\*): IN_PROGRESS$/m, `$1: COMPLETE (${currentDate})`);
  await fs6.writeFile(epicFilePath, updatedEpicContent);
  const journeyContent = await fs6.readFile(journeyFile, "utf-8");
  const updatedJourneyContent = journeyContent.replace(new RegExp(`^(\\| E${epicNum} \\| .+? \\|) IN_PROGRESS `, "m"), `$1 COMPLETE `);
  await fs6.writeFile(journeyFile, updatedJourneyContent);
  logSuccess(`\u2705 Epic E${epicNum} marked as COMPLETE`);
}
async function getEpicStatus(journeyFile, epicId) {
  const epicProgressTable = await extractEpicProgressTable(journeyFile);
  for (const line of epicProgressTable.split(`
`)) {
    if (line.includes(` ${epicId} `)) {
      const match = line.match(/^\| E\d+ \| (.+?) \| (\w+) /);
      if (match) {
        return match[2];
      }
    }
  }
  return "UNKNOWN";
}
async function getEpicNameFromTable(journeyFile, epicId) {
  const epicProgressTable = await extractEpicProgressTable(journeyFile);
  for (const line of epicProgressTable.split(`
`)) {
    if (line.includes(` ${epicId} `)) {
      const match = line.match(/^\| E\d+ \| (.+?) \| /);
      if (match) {
        return match[1].trim();
      }
    }
  }
  return "Unknown Epic";
}
async function getNextEpicId(journeyFile, currentEpic) {
  const epicProgressTable = await extractEpicProgressTable(journeyFile);
  const currentNum = parseInt(currentEpic.replace(/\D/g, ""), 10) || 0;
  const nextNum = currentNum + 1;
  const nextEpicId = `E${nextNum}`;
  if (epicProgressTable.includes(` ${nextEpicId} `)) {
    return nextEpicId;
  }
  return "NONE";
}
async function shouldContinueToNextEpic(journeyFile, currentEpic) {
  const epicStatus = await getEpicStatus(journeyFile, currentEpic);
  return epicStatus.includes("COMPLETE");
}

// src/checkpoint.ts
import { spawn as spawn2 } from "child_process";
import { promises as fs7, existsSync as existsSync5 } from "fs";
import path5 from "path";
async function gitCommand(args, cwd) {
  const workingDir = cwd || config.projectDir;
  return new Promise((resolve, reject) => {
    const proc = spawn2("git", args, {
      cwd: workingDir,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    proc.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    proc.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    proc.on("close", (code) => {
      if (code === 0 || code !== null && code !== 128) {
        resolve({ stdout, exitCode: code || 0 });
      } else {
        reject(new Error(`Git command failed: ${args.join(" ")}
${stderr}`));
      }
    });
    proc.on("error", (error) => {
      reject(new Error(`Failed to execute git command: ${error}`));
    });
  });
}
function assertInParentProject(cwd) {
  const modulesPath = path5.join(cwd, ".git", "modules");
  if (existsSync5(modulesPath)) {
    throw new VModelError("Git operation attempted from submodule. Must use parent project directory.", 1, false);
  }
  const dirName = path5.basename(cwd);
  if (dirName === "ai-v-model") {
    const parentDir = path5.dirname(cwd);
    const hasParentGit = existsSync5(path5.join(parentDir, ".git"));
    const hasVModelDir = existsSync5(path5.join(parentDir, "v_model"));
    if (hasParentGit || hasVModelDir) {
      throw new VModelError("Git operation attempted from ai-v-model directory. Must use parent project directory.", 1, false);
    }
  }
}
async function getCurrentBranch(cwd) {
  try {
    const result = await gitCommand(["branch", "--show-current"], cwd);
    return result.stdout.trim();
  } catch {
    return "";
  }
}
async function hasUncommittedChanges(cwd) {
  try {
    const result = await gitCommand(["status", "--porcelain"], cwd);
    return result.stdout.trim().length > 0;
  } catch {
    return false;
  }
}
async function createCheckpoint(journeyName, milestoneNumber, description) {
  const tag = `journey-${journeyName}-milestone-${milestoneNumber}`;
  try {
    await gitCommand(["rev-parse", tag]);
    logWarning(`Tag ${tag} already exists, skipping`);
    return;
  } catch {}
  assertInParentProject(config.projectDir);
  try {
    await gitCommand(["tag", "-a", tag, "-m", `Journey checkpoint: ${description}`, "HEAD"], config.projectDir);
    logSuccess(`Created checkpoint: ${tag}`);
  } catch (error) {
    logWarning(`Failed to create checkpoint: ${error}`);
  }
}
async function rollbackToCheckpoint(journeyFile, checkpointId) {
  const content = await fs7.readFile(journeyFile, "utf-8");
  const checkpointsSection = content.match(/## Checkpoints\n([\s\S]+?)\n## /);
  if (!checkpointsSection) {
    logError("No checkpoints section found in journey file");
    return;
  }
  const checkpoints = [];
  for (const line of checkpointsSection[1].split(`
`)) {
    const match = line.match(/^\| (\d+) \| ([\w-]+) \|/);
    if (match) {
      checkpoints.push({ id: parseInt(match[1], 10), tag: match[2] });
    }
  }
  let targetCheckpoint;
  if (checkpointId !== undefined) {
    targetCheckpoint = checkpoints.find((c) => c.id === checkpointId);
  } else {
    targetCheckpoint = checkpoints[checkpoints.length - 1];
  }
  if (!targetCheckpoint) {
    logError(`Checkpoint ID ${checkpointId || "latest"} not found`);
    return;
  }
  logWarning(`Rolling back to checkpoint: ${targetCheckpoint.tag}`);
  logInfo("This will reset your working directory to the state at " + targetCheckpoint.tag);
  assertInParentProject(config.projectDir);
  try {
    await gitCommand(["reset", "--hard", targetCheckpoint.tag], config.projectDir);
    logSuccess(`Rolled back to ${targetCheckpoint.tag}`);
  } catch (error) {
    logError(`Rollback failed: ${error}`);
  }
}
async function listCheckpoints(journeyFile) {
  const content = await fs7.readFile(journeyFile, "utf-8");
  const checkpointsSection = content.match(/## Checkpoints\n([\s\S]+?)\n## /);
  if (!checkpointsSection) {
    return [];
  }
  const checkpoints = [];
  for (const line of checkpointsSection[1].split(`
`)) {
    const match = line.match(/^\| (\d+) \| ([\w-]+) \| (\d{4}-\d{2}-\d{2}) \| (.+?) \|/);
    if (match) {
      checkpoints.push({
        id: parseInt(match[1], 10),
        tag: match[2],
        date: match[3],
        description: match[4].trim()
      });
    }
  }
  return checkpoints;
}
async function commitChanges(message) {
  assertInParentProject(config.projectDir);
  try {
    await gitCommand(["add", "-A"], config.projectDir);
    const hasChanges = await hasUncommittedChanges(config.projectDir);
    if (!hasChanges) {
      logInfo("No changes to commit");
      return;
    }
    await gitCommand(["commit", "-m", message], config.projectDir);
    logSuccess("Changes committed");
  } catch (error) {
    logWarning(`Commit failed: ${error}`);
  }
}
async function pushChanges(branch) {
  assertInParentProject(config.projectDir);
  try {
    const targetBranch = branch || await getCurrentBranch(config.projectDir);
    if (!targetBranch) {
      logWarning("No branch detected, skipping push");
      return;
    }
    await gitCommand(["push", "origin", targetBranch], config.projectDir);
    logSuccess(`Pushed to origin/${targetBranch}`);
  } catch (error) {
    logWarning(`Git push failed: ${error}`);
  }
}

// src/state-machine.ts
import { promises as fs8, existsSync as existsSync6 } from "fs";
async function getPreviousDesignPhase(journeyFile) {
  const content = await readJourneyFile(journeyFile);
  const prevPhaseMatch = content.match(/^- Previous Phase:\s*(.+)$/m);
  if (prevPhaseMatch) {
    return prevPhaseMatch[1].trim().replace(/\s+/g, "");
  }
  if (content.includes("Transitioned to SYSTEM_DESIGN")) {
    return "REQUIREMENTS";
  } else if (content.includes("Transitioned to ARCH_DESIGN")) {
    return "SYSTEM_DESIGN";
  } else if (content.includes("Transitioned to MODULE_DESIGN")) {
    return "ARCH_DESIGN";
  } else if (content.includes("Transitioned to IMPLEMENTATION")) {
    return "MODULE_DESIGN";
  }
  return "UNKNOWN";
}
async function autoTransitionFromReview(journeyFile, previousPhase) {
  const content = await readJourneyFile(journeyFile);
  const stateMatch = content.match(/^- State:\s*(\w+)$/m);
  if (!stateMatch) {
    return;
  }
  const _currentState = stateMatch[1].toUpperCase();
  let nextState;
  switch (previousPhase) {
    case "REQUIREMENTS":
      nextState = "SYSTEM_DESIGN" /* SYSTEM_DESIGN */;
      break;
    case "SYSTEM_DESIGN":
      nextState = "ARCH_DESIGN" /* ARCH_DESIGN */;
      break;
    case "ARCH_DESIGN":
      nextState = "MODULE_DESIGN" /* MODULE_DESIGN */;
      break;
    case "MODULE_DESIGN":
      nextState = "IMPLEMENTATION" /* IMPLEMENTATION */;
      break;
    default:
      nextState = "REQUIREMENTS" /* REQUIREMENTS */;
  }
  await setJourneyState(journeyFile, nextState);
  await addLearning(journeyFile, `Design review approved: ${previousPhase} \u2192 ${nextState}`);
  await appendToFile(journeyFile, `
**Design Review Approved: ${previousPhase} \u2192 ${nextState}**
`);
}
async function transitionToNextEpic(journeyFile, completedEpic) {
  const nextEpic = await getNextEpicId(journeyFile, completedEpic);
  if (nextEpic === "NONE") {
    logInfo("All epics complete - transitioning to SYSTEM_TEST");
    await setJourneyState(journeyFile, "SYSTEM_TEST" /* SYSTEM_TEST */);
    await createCheckpoint(journeyFile, Date.now(), "All epics completed, transitioning to SYSTEM_TEST");
  } else {
    logInfo(`Transitioning to ${nextEpic} ARCH_DESIGN phase`);
    const nextEpicNum = parseInt(nextEpic.replace(/\D/g, ""), 10);
    const nextEpicName = await getEpicNameFromTable(journeyFile, nextEpic);
    const _journeyName = journeyFile.split("/").pop()?.replace(".journey.md", "") || "";
    const epicFile = await createOrUpdateEpicFile(journeyFile, nextEpicNum, nextEpicName);
    if (!existsSync6(epicFile)) {
      console.error(`Failed to create epic file: ${epicFile}`);
      await setJourneyState(journeyFile, "ARCH_DESIGN" /* ARCH_DESIGN */);
      return;
    }
    logInfo(`Epic file created: ${epicFile}`);
    await appendToFile(journeyFile, `
**Epic ${nextEpic}: ${nextEpicName}** - See \`.journey.E${nextEpicNum}.md\` for detailed work.
`);
    await setCurrentEpic(journeyFile, nextEpic);
    await setJourneyState(journeyFile, "ARCH_DESIGN" /* ARCH_DESIGN */);
    await addLearning(journeyFile, `Auto-transition: Epic ${completedEpic} \u2192 ${nextEpic}`);
    await appendToFile(journeyFile, `
**Auto-Transition: Epic ${completedEpic} \u2192 ${nextEpic}**
`);
  }
}
async function checkContinueToNextEpic(journeyFile, currentEpic) {
  return shouldContinueToNextEpic(journeyFile, currentEpic);
}

// src/main-loop.ts
async function generateIterationPrompt(journeyFile, state, epicFile) {
  const journeyContent = await fs9.readFile(journeyFile, "utf-8");
  const journeyName = path6.basename(journeyFile, ".journey.md");
  let epicContent = "";
  let epicInstructions = "";
  if (epicFile) {
    try {
      epicContent = await fs9.readFile(epicFile, "utf-8");
      epicInstructions = `
## Epic File Content (PRIMARY location for epic work)

The following is the FULL content of the epic file. This is where epic work happens:
---
${epicContent}
---

**CRITICAL**: When working on this epic, update the epic file directly:
- Story designs go in the epic file
- Epic research goes in the epic file
- Implementation progress goes in the epic file
- Only summaries go in journey.md
`;
    } catch {}
  }
  const vars = {
    AI_PROVIDER: config.aiProvider,
    JOURNEY_CONTENT: journeyContent,
    EPIC_CONTENT: epicContent || undefined,
    EPIC_FILE_INSTRUCTIONS: epicInstructions || undefined,
    JOURNEY_FILE: journeyFile,
    JOURNEY_NAME: journeyName
  };
  const prompt = mainIterationPrompt(vars);
  return prompt;
}
async function runIteration(journeyFile) {
  const journeyName = path6.basename(journeyFile, ".journey.md");
  const state = await getJourneyState(journeyFile);
  logState(`Current state: ${state}`);
  logPhase(`Running iteration for ${journeyName}...`);
  const currentEpic = await getCurrentEpic(journeyFile);
  let epicFile = "";
  if (currentEpic && currentEpic !== "TBD" && state !== "SYSTEM_DESIGN" /* SYSTEM_DESIGN */ && state !== "REQUIREMENTS" /* REQUIREMENTS */) {
    const journeyDir = path6.dirname(journeyFile);
    const epicNum = currentEpic.replace(/\D/g, "");
    epicFile = path6.join(journeyDir, `${journeyName}.journey.E${epicNum}.md`);
    try {
      await fs9.access(epicFile);
    } catch {
      logWarning(`Epic file not found: ${epicFile} - using main journey only`);
      epicFile = "";
    }
  }
  const prompt = await generateIterationPrompt(journeyFile, state, epicFile);
  const tempPrompt = `/tmp/v-model-iteration-${Date.now()}.md`;
  await fs9.writeFile(tempPrompt, `${prompt}

Current working directory: ${process.cwd()}
`);
  if (config.verbose) {
    logDebug("--- Iteration prompt ---");
    process.stderr.write(await fs9.readFile(tempPrompt, "utf-8"));
    logDebug("--- End of prompt ---");
  }
  try {
    const exitCode = await runAIWithPrompt(tempPrompt);
    if (exitCode === 130) {
      process.exit(130);
    }
    return exitCode;
  } finally {
    try {
      await fs9.unlink(tempPrompt);
    } catch {}
  }
}
async function handleDesignReview(journeyFile) {
  if (!config.consultGemini) {
    logInfo("Gemini consultation disabled - auto-approving design...");
    const prevPhase2 = await getPreviousDesignPhase(journeyFile);
    await autoTransitionFromReview(journeyFile, prevPhase2);
    return;
  }
  logInfo("Running design review with Gemini consultation...");
  let prevPhase = await getPreviousDesignPhase(journeyFile);
  if (prevPhase === "UNKNOWN") {
    logWarning("Could not determine previous phase - defaulting to SYSTEM_DESIGN");
    prevPhase = "REQUIREMENTS";
  }
  logInfo(`Reviewing design from phase: ${prevPhase}`);
  const designContent = await extractDesignContent(journeyFile, prevPhase);
  const researchContent = await extractResearchContent(journeyFile, prevPhase);
  logInfo(`Consulting Gemini for ${prevPhase} phase review...`);
  try {
    const geminiFeedback = await consultGemini(prevPhase, designContent, researchContent);
    if (geminiFeedback.includes("DECISION: ITERATE")) {
      logWarning("Gemini identified major issues. Iterating...");
      await appendToFile(journeyFile, `
## Gemini Review: ITERATE

${geminiFeedback}
`);
      await setJourneyState(journeyFile, prevPhase);
    } else {
      logSuccess("Gemini approved design. Proceeding...");
      await appendToFile(journeyFile, `
## Gemini Review: APPROVED

${geminiFeedback}
`);
      await autoTransitionFromReview(journeyFile, prevPhase);
    }
  } catch (error) {
    logError(`Gemini consultation failed: ${error}`);
    logWarning("Falling back to auto-approval");
    await autoTransitionFromReview(journeyFile, prevPhase);
  }
}
async function handleWaitingForUser(journeyFile) {
  const content = await fs9.readFile(journeyFile, "utf-8");
  const pendingQuestionsMatch = content.match(/## Pending Questions\n([\s\S]+?)\n## /);
  const pendingQuestions = pendingQuestionsMatch?.[1].split(`
`).filter((line) => line.match(/^- \[ \] /)).join(`
`) || "";
  if (!pendingQuestions) {
    const currentEpic = await getCurrentEpic(journeyFile);
    if (currentEpic !== "TBD" && await checkContinueToNextEpic(journeyFile, currentEpic)) {
      logInfo(`Epic ${currentEpic} complete - auto-transitioning to next epic...`);
      await transitionToNextEpic(journeyFile, currentEpic);
      await archive_completed_epics_if_needed(journeyFile);
      return;
    }
    logInfo("No pending questions found - resuming iteration (hints or in-progress epic)");
    await setJourneyState(journeyFile, "IMPLEMENTATION" /* IMPLEMENTATION */);
    await runIteration(journeyFile);
    return;
  }
  logWarning(`Journey is WAITING_FOR_USER. Use 'v-model hint "message"' to provide input.`);
  logInfo("Current pending questions:");
  console.error(pendingQuestions);
}
async function handleArchiving(journeyFile) {
  logInfo("Archiving completed epics...");
  const preArchiveState = await getPreviousState(journeyFile);
  const completedUnarchivedEpics = await getCompletedUnarchivedEpics(journeyFile);
  for (const epicNum of completedUnarchivedEpics) {
    await markEpicComplete(journeyFile, epicNum);
  }
  await setJourneyState(journeyFile, preArchiveState || "BLOCKED");
}
async function mainLoop(journeyFile) {
  const journeyName = path6.basename(journeyFile, ".journey.md");
  logInfo(`Starting main loop for journey: ${journeyName}`);
  let iteration = 0;
  while (iteration < config.maxIterations) {
    iteration++;
    const state = await getJourneyState(journeyFile);
    logDebug(`Iteration ${iteration}, state: ${state}`);
    switch (state) {
      case "COMPLETE" /* COMPLETE */:
        logSuccess("Journey complete!");
        return;
      case "BLOCKED" /* BLOCKED */:
        logWarning(`Journey is blocked. Use 'v-model hint "message"' to unblock.`);
        return;
      case "WAITING_FOR_USER" /* WAITING_FOR_USER */:
        await handleWaitingForUser(journeyFile);
        break;
      case "DESIGN_REVIEW" /* DESIGN_REVIEW */:
        await handleDesignReview(journeyFile);
        break;
      case "ARCHIVING" /* ARCHIVING */:
        await handleArchiving(journeyFile);
        break;
      default: {
        await runIteration(journeyFile);
        const currentBranch = await getCurrentBranch();
        if (currentBranch) {
          const hasChanges = await hasUncommittedChanges();
          if (hasChanges) {
            logWarning("Uncommitted changes detected after iteration - committing now");
            await commitChanges(`chore(journey): auto-commit changes from iteration ${iteration} [${journeyName}]`);
          }
          if (!config.noPush) {
            logInfo(`Pushing to origin/${currentBranch}...`);
            await pushChanges(currentBranch);
          }
        }
        await archive_completed_epics_if_needed(journeyFile);
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  if (iteration >= config.maxIterations) {
    logWarning(`Maximum iterations reached (${config.maxIterations})`);
  }
}
async function archive_completed_epics_if_needed(journeyFile) {
  const completedUnarchivedEpics = await getCompletedUnarchivedEpics(journeyFile);
  if (completedUnarchivedEpics.length === 0) {
    return;
  }
  logInfo(`\uD83D\uDCE6 ${completedUnarchivedEpics.length} completed epic(s) need archiving \u2014 setting state to ARCHIVING`);
  const currentState = await getJourneyState(journeyFile);
  await setPreviousState(journeyFile, currentState);
  await setJourneyState(journeyFile, "ARCHIVING" /* ARCHIVING */);
}

// src/index.ts
async function ensureDirectories() {
  const vModelDir = path7.join(config.projectDir, "v_model");
  const journeyDir = path7.join(vModelDir, "journey");
  const prototypesDir = path7.join(vModelDir, "prototypes");
  await fs10.mkdir(journeyDir, { recursive: true });
  await fs10.mkdir(prototypesDir, { recursive: true });
}
async function handleHint(hint) {
  const activeJourney = await findActiveJourney();
  if (!activeJourney) {
    logError("No active journey found");
    logInfo('Create one with: v-model "your goal"');
    throw new VModelError("No active journey found", 1);
  }
  await addUserHint(activeJourney, hint);
  logSuccess("Hint added to journey");
  const state = await getJourneyState(activeJourney);
  if (state === "WAITING_FOR_USER") {
    logInfo("Journey was waiting - resuming...");
    await setJourneyState(activeJourney, "REQUIREMENTS");
  }
}
async function handlePivot() {
  const activeJourney = await findActiveJourney();
  if (!activeJourney) {
    logError("No active journey found");
    throw new VModelError("No active journey found", 1);
  }
  logInfo("Forcing pivot for active journey");
  await setJourneyState(activeJourney, "PIVOTING");
  logSuccess("Journey state set to PIVOTING");
}
async function handleReflect() {
  const activeJourney = await findActiveJourney();
  if (!activeJourney) {
    logError("No active journey found");
    throw new VModelError("No active journey found", 1);
  }
  logInfo("Forcing reflection for active journey");
  await setJourneyState(activeJourney, "REFLECTING");
  logSuccess("Journey state set to REFLECTING");
}
async function handleArchive() {
  const activeJourney = await findActiveJourney();
  if (!activeJourney) {
    logError("No active journey found");
    throw new VModelError("No active journey found", 1);
  }
  logInfo("Archiving completed epics for active journey");
  const currentState = await getJourneyState(activeJourney);
  await setPreviousState(activeJourney, currentState);
  await setJourneyState(activeJourney, "ARCHIVING");
}
async function handleRollback(checkpointId) {
  const activeJourney = await findActiveJourney();
  if (!activeJourney) {
    logError("No active journey found");
    throw new VModelError("No active journey found", 1);
  }
  const id = checkpointId ? parseInt(checkpointId, 10) : undefined;
  await rollbackToCheckpoint(activeJourney, id);
}
async function handleListCheckpoints() {
  const activeJourney = await findActiveJourney();
  if (!activeJourney) {
    logError("No active journey found");
    throw new VModelError("No active journey found", 1);
  }
  const checkpoints = await listCheckpoints(activeJourney);
  console.log(`
\x1B[36m=== Checkpoints ===\x1B[0m
`);
  console.log("| ID | Tag                | Date       | Description |");
  console.log("| -- | ------------------ | ---------- | ----------- |");
  for (const checkpoint of checkpoints) {
    console.log(`| ${checkpoint.id} | ${checkpoint.tag} | ${checkpoint.date} | ${checkpoint.description} |`);
  }
  console.log();
}
async function handleStatus() {
  await ensureDirectories();
  const journeys = await listJourneys();
  if (journeys.length === 0) {
    logInfo("No journeys found");
    logInfo('Start a new journey with: v-model "your goal"');
    return;
  }
  console.log(`
\x1B[36m=== Journeys ===\x1B[0m
`);
  for (const journey of journeys) {
    const isActive = journey.state !== "COMPLETE";
    const statusIcon = isActive ? "\uD83D\uDD04" : "\u2705";
    console.log(`${statusIcon} ${journey.goal}`);
    console.log(`   State: ${journey.state}`);
    console.log(`   Progress: ${journey.progress}%`);
    if (isActive) {
      console.log(`   Current Epic: ${journey.currentEpic}`);
      console.log(`   Started: ${journey.started}`);
    }
    console.log();
  }
  const activeJourney = await findActiveJourney();
  if (activeJourney) {
    console.log("\x1B[33m=== Active Journey Details ===\x1B[0m");
    console.log(`
\x1B[33mMeta:\x1B[0m`);
    const content = await fs10.readFile(activeJourney, "utf-8");
    const metaLines = content.match(/^- .+$/gm);
    if (metaLines) {
      for (const line of metaLines) {
        console.log(`  ${line.replace(/^- /, "")}`);
      }
    }
    console.log(`
\x1B[33mCheckpoints:\x1B[0m`);
    const checkpoints = await listCheckpoints(activeJourney);
    if (checkpoints.length > 0) {
      console.log("| ID | Tag | Date | Description |");
      console.log("| -- | --- | ---- | ----------- |");
      for (const checkpoint of checkpoints) {
        console.log(`| ${checkpoint.id} | ${checkpoint.tag} | ${checkpoint.date} | ${checkpoint.description} |`);
      }
    } else {
      console.log("  No checkpoints yet");
    }
    console.log(`
\x1B[33mCurrent Approach:\x1B[0m`);
    const approach = await getCurrentApproach(activeJourney);
    console.log(`  ${approach}`);
    const pendingQuestionsMatch = content.match(/## Pending Questions\n([\s\S]+?)\n## /);
    const pendingQuestions = pendingQuestionsMatch?.[1].split(`
`).filter((line) => line.match(/^- \[ \] /)).join(`
`);
    if (pendingQuestions) {
      console.log(`
\x1B[33mPending Questions:\x1B[0m`);
      console.log(pendingQuestions);
    }
  }
}
function setupSignalHandlers() {
  process.on("SIGINT", () => {
    logInfo(`
Interrupted by user`);
    cleanup();
    process.exit(130);
  });
  process.on("SIGTERM", () => {
    logInfo("Received SIGTERM, cleaning up...");
    cleanup();
    process.exit(143);
  });
  process.on("SIGHUP", () => {
    logInfo("Terminal disconnected, cleaning up...");
    cleanup();
    process.exit(129);
  });
}
function cleanup() {
  killAllChildProcesses();
}
async function main() {
  const program2 = new Command;
  program2.name("v-model").description("Autonomous R&D agent using V-Model methodology").version("1.0.0");
  program2.argument("[goal]", "Start a new journey with this goal").option("-v, --verbose", "Enable verbose output").option("-g, --gemini", "Use Gemini as primary AI").option("--no-consult", "Disable Gemini consultation").option("--project-dir <path>", "Specify project directory").option("--config <path>", "Specify config file").option("--no-push", "Disable auto-push after iterations").option("--commit-interval <n>", "Commit every N iterations", "1").action(async (goal, options) => {
    try {
      await initializeConfig({
        verbose: options.verbose,
        aiProvider: options.gemini ? "gemini" : "claude",
        consultGemini: options.consult !== false,
        projectDir: options.projectDir,
        noPush: options.noPush || false,
        commitInterval: parseInt(options.commitInterval, 10)
      }, options.config);
      setupSignalHandlers();
      await ensureDirectories();
      if (!goal) {
        const activeJourney = await findActiveJourney();
        if (!activeJourney) {
          logError("No active journey found");
          logInfo('Start a new journey with: v-model "your goal"');
          logInfo("Or check status with: v-model status");
          process.exitCode = 1;
          return;
        }
        await mainLoop(activeJourney);
        return;
      }
      logInfo(`Creating new journey for goal: ${goal}`);
      const journeyFile = await createJourneyFile(goal);
      if (!journeyFile) {
        logError("Failed to create journey file");
        process.exitCode = 1;
        return;
      }
      logSuccess("Journey created! Starting loop...");
      await mainLoop(journeyFile);
      return;
    } catch (error) {
      if (error instanceof VModelError) {
        if (error.recoverable) {
          logWarning(`Recoverable error: ${error.message}`);
        } else {
          logError(error.message);
          process.exitCode = error.exitCode;
        }
      } else if (error instanceof Error) {
        logError(error.message);
        process.exitCode = 1;
      } else {
        process.exitCode = 1;
      }
    }
  });
  program2.command("status").description("Show status of all journeys").action(async () => {
    await initializeConfig();
    await handleStatus();
  });
  program2.command("hint <message>").description("Add a user hint to the journey").action(async (message) => {
    await initializeConfig();
    await handleHint(message);
  });
  program2.command("pivot").description("Force pivot to next approach").action(async () => {
    await initializeConfig();
    await handlePivot();
  });
  program2.command("reflect").description("Force reflection phase").action(async () => {
    await initializeConfig();
    await handleReflect();
  });
  program2.command("archive").description("Archive completed epics").action(async () => {
    await initializeConfig();
    await handleArchive();
  });
  program2.command("rollback [id]").description("Rollback to checkpoint").action(async (id) => {
    await initializeConfig();
    await handleRollback(id);
  });
  program2.command("list-checkpoints").description("List all checkpoints").action(async () => {
    await initializeConfig();
    await handleListCheckpoints();
  });
  await program2.parseAsync(process.argv);
  return 0;
}
main().then((exitCode) => {
  process.exit(exitCode);
}, (error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
