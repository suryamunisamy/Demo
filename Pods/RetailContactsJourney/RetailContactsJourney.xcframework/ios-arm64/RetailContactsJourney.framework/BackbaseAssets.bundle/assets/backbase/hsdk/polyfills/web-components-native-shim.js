/**
 * Name: web-components-native-shim
 * Description: Allows to use transpiled ES2015 classes as Custom Elements
 * Version: 1.10.0
 * SHA-1: b19ed6f55f320831304a499f3efbe79b991eb36d
 */
(function(){"use strict";
/**
   * @license
   * Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
   * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
   * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
   * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
   * Code distributed by Google as part of the polymer project is also
   * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
   */
(function(){if(window.Reflect===undefined||window.customElements===undefined||window.customElements.hasOwnProperty("polyfillWrapFlushCallback")){return}const BuiltInHTMLElement=HTMLElement;window.HTMLElement=function HTMLElement(){return Reflect.construct(BuiltInHTMLElement,[],this.constructor)};HTMLElement.prototype=BuiltInHTMLElement.prototype;HTMLElement.prototype.constructor=HTMLElement;Object.setPrototypeOf(HTMLElement,BuiltInHTMLElement)})()})();
