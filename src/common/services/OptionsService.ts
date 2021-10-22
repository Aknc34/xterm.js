/**
 * Copyright (c) 2019 The xterm.js authors. All rights reserved.
 * @license MIT
 */

import { IOptionsService, ITerminalOptions, FontWeight } from 'common/services/Services';
import { EventEmitter, IEvent } from 'common/EventEmitter';
import { isMac } from 'common/Platform';

// Source: https://freesound.org/people/altemark/sounds/45759/
// This sound is released under the Creative Commons Attribution 3.0 Unported
// (CC BY 3.0) license. It was created by 'altemark'. No modifications have been
// made, apart from the conversion to base64.
export const DEFAULT_BELL_SOUND = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4LjMyLjEwNAAAAAAAAAAAAAAA//tQxAADB8AhSmxhIIEVCSiJrDCQBTcu3UrAIwUdkRgQbFAZC1CQEwTJ9mjRvBA4UOLD8nKVOWfh+UlK3z/177OXrfOdKl7pyn3Xf//WreyTRUoAWgBgkOAGbZHBgG1OF6zM82DWbZaUmMBptgQhGjsyYqc9ae9XFz280948NMBWInljyzsNRFLPWdnZGWrddDsjK1unuSrVN9jJsK8KuQtQCtMBjCEtImISdNKJOopIpBFpNSMbIHCSRpRR5iakjTiyzLhchUUBwCgyKiweBv/7UsQbg8isVNoMPMjAAAA0gAAABEVFGmgqK////9bP/6XCykxBTUUzLjEwMKqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq';

export const DEFAULT_OPTIONS: Readonly<ITerminalOptions> = {
  cols: 80,
  rows: 24,
  cursorBlink: false,
  cursorStyle: 'block',
  cursorWidth: 1,
  customGlyphs: true,
  bellSound: DEFAULT_BELL_SOUND,
  bellStyle: 'none',
  drawBoldTextInBrightColors: true,
  fastScrollModifier: 'alt',
  fastScrollSensitivity: 5,
  fontFamily: 'courier-new, courier, monospace',
  fontSize: 15,
  fontWeight: 'normal',
  fontWeightBold: 'bold',
  lineHeight: 1.0,
  linkTooltipHoverDuration: 500,
  letterSpacing: 0,
  logLevel: 'info',
  scrollback: 1000,
  scrollSensitivity: 1,
  screenReaderMode: false,
  macOptionIsMeta: false,
  macOptionClickForcesSelection: false,
  minimumContrastRatio: 1,
  disableStdin: false,
  allowProposedApi: true,
  allowTransparency: false,
  tabStopWidth: 8,
  theme: {},
  rightClickSelectsWord: isMac,
  rendererType: 'canvas',
  windowOptions: {},
  windowsMode: false,
  wordSeparator: ' ()[]{}\',"`',
  altClickMovesCursor: true,
  convertEol: false,
  termName: 'xterm',
  cancelEvents: false
};

const FONT_WEIGHT_OPTIONS: Extract<FontWeight, string>[] = ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'];

/**
 * The set of options that only have an effect when set in the Terminal constructor.
 */
const CONSTRUCTOR_ONLY_OPTIONS = ['cols', 'rows'];

export class OptionsService implements IOptionsService {
  public serviceBrand: any;

  private _options: any;
  public options: ITerminalOptions;

  private _onOptionChange = new EventEmitter<string>();
  public get onOptionChange(): IEvent<string> { return this._onOptionChange.event; }

  constructor(options: Partial<ITerminalOptions>) {
    this.options = { ...DEFAULT_OPTIONS };
    for (const key in options) {
      if (key in this.options) {
        try {
          const newValue = options[key];
          this.options[key] = this._sanitizeAndValidateOption(key, newValue);
        } catch (e) {
          console.error(e);
        }
      }
    }

    this._options = {};
    for (const propName in this.options) {
      const privatePropName = `_${propName}`;
      this._options[privatePropName] = this.options[propName];

      Object.defineProperty(this.options, propName, {
        get: () => {
          if (!(propName in DEFAULT_OPTIONS)) {
            throw new Error(`No option with key "${propName}"`);
          }
          return this._options[privatePropName];
        },
        set: (value: any) => {
          if (!(propName in DEFAULT_OPTIONS)) {
            throw new Error('No option with key "' + propName + '"');
          }

          value = this._sanitizeAndValidateOption(propName, value);
          // Don't fire an option change event if they didn't change
          if (this._options[privatePropName] !== value) {
            this._options[privatePropName] = value;
            this._onOptionChange.fire(propName);
          }
        }
      });
    }
  }

  public get publicOptions(): ITerminalOptions {
    const publicOptions = { ... this.options };
    for (const propName in CONSTRUCTOR_ONLY_OPTIONS) {
      const privatePropName = `_${propName}`;
      Object.defineProperty(publicOptions, propName, {
        get: () => {
          if (!(propName in DEFAULT_OPTIONS)) {
            throw new Error(`No option with key "${propName}"`);
          }
          return this._options[privatePropName];
        },
        set: (value: any) => {
          if (!(propName in DEFAULT_OPTIONS)) {
            throw new Error('No option with key "' + propName + '"');
          }
          // Throw an error if any constructor only option is modified
          // from terminal.options
          if (CONSTRUCTOR_ONLY_OPTIONS.includes(propName)) {
            throw new Error(`Option "${propName}" can only be set in the constructor`);
          }

          value = this._sanitizeAndValidateOption(propName, value);
          // Don't fire an option change event if they didn't change
          if (this._options[privatePropName] !== value) {
            this._options[privatePropName] = value;
            this._onOptionChange.fire(propName);
          }
        }
      });
    }
    return publicOptions;
  }

  public setOption(key: string, value: any): void {
    this.options[key] = value;
  }

  private _sanitizeAndValidateOption(key: string, value: any): any {
    switch (key) {
      case 'bellStyle':
      case 'cursorStyle':
      case 'rendererType':
      case 'wordSeparator':
        if (!value) {
          value = DEFAULT_OPTIONS[key];
        }
        break;
      case 'fontWeight':
      case 'fontWeightBold':
        if (typeof value === 'number' && 1 <= value && value <= 1000) {
          // already valid numeric value
          break;
        }
        value = FONT_WEIGHT_OPTIONS.includes(value) ? value : DEFAULT_OPTIONS[key];
        break;
      case 'cursorWidth':
        value = Math.floor(value);
        // Fall through for bounds check
      case 'lineHeight':
      case 'tabStopWidth':
        if (value < 1) {
          throw new Error(`${key} cannot be less than 1, value: ${value}`);
        }
        break;
      case 'minimumContrastRatio':
        value = Math.max(1, Math.min(21, Math.round(value * 10) / 10));
        break;
      case 'scrollback':
        value = Math.min(value, 4294967295);
        if (value < 0) {
          throw new Error(`${key} cannot be less than 0, value: ${value}`);
        }
        break;
      case 'fastScrollSensitivity':
      case 'scrollSensitivity':
        if (value <= 0) {
          throw new Error(`${key} cannot be less than or equal to 0, value: ${value}`);
        }
      case 'rows':
      case 'cols':
        if (!value && value !== 0) {
          throw new Error(`${key} must be numeric, value: ${value}`);
        }
        break;
    }
    return value;
  }

  public getOption(key: string): any {
    return this.options[key];
  }
}
