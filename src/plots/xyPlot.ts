///<reference path="../reference.ts" />

module Plottable {
export class XYPlot<X, Y> extends Plot {
  protected static _X_KEY = "x";
  protected static _Y_KEY = "y";
  private _autoAdjustXScaleDomain = false;
  private _autoAdjustYScaleDomain = false;
  private _adjustYDomainOnChangeFromXCallback: ScaleCallback<Scale<any, any>>;
  private _adjustXDomainOnChangeFromYCallback: ScaleCallback<Scale<any, any>>;

  private _deferredRendering = false;
  private _cachedDomainX: X[] = [null, null];
  private _cachedDomainY: Y[] = [null, null];

  /**
   * An XYPlot is a Plot that displays data along two primary directions, X and Y.
   *
   * @constructor
   * @param {Scale} xScale The x scale to use.
   * @param {Scale} yScale The y scale to use.
   */
  constructor() {
    super();
    this.addClass("xy-plot");

    this._adjustYDomainOnChangeFromXCallback = (scale) => this._adjustYDomainOnChangeFromX();
    this._adjustXDomainOnChangeFromYCallback = (scale) => this._adjustXDomainOnChangeFromY();

    var _deltaX = 0;
    var _deltaY = 0;
    var _scalingX = 1;
    var _scalingY = 1;
    var _lastSeenDomainX: X[] = null;
    var _lastSeenDomainY: Y[] = null;
    var _timeoutReference = 0;
    var _deferredRenderingTimeout = 500;

    var _registerDeferredRendering = () => {
      if (this._renderArea == null) {
        return;
      }
      this._renderArea.attr("transform",
        "translate(" + _deltaX + ", " + _deltaY + ")" +
        "scale(" + _scalingX + ", " + _scalingY + ")");
      clearTimeout(_timeoutReference);
      _timeoutReference = setTimeout(() => {
        this._cachedDomainX = _lastSeenDomainX;
        this._cachedDomainY = _lastSeenDomainY;
        _deltaX = 0;
        _deltaY = 0;
        this.render();
        this._renderArea.attr("transform", "translate(0, 0) scale(1, 1)");
      }, _deferredRenderingTimeout);
    };

    var _lazyDomainChangeCallbackX = (scale: Scale<X, any>) => {
      if (!this._isAnchored) {
        return;
      }
      _lastSeenDomainX = scale.domain();
      _scalingX = (scale.scale(this._cachedDomainX[1]) - scale.scale(this._cachedDomainX[0])) /
        (scale.scale(_lastSeenDomainX[1]) - scale.scale(_lastSeenDomainX[0])) || 1;
      _deltaX = scale.scale(this._cachedDomainX[0]) - scale.scale(_lastSeenDomainX[0]) || 0;

      _registerDeferredRendering();
    };

    var _lazyDomainChangeCallbackY = (scale: Scale<Y, any>) => {
      if (!this._isAnchored) {
        return;
      }
      _lastSeenDomainY = scale.domain();
      _scalingY = (scale.scale(this._cachedDomainY[1]) - scale.scale(this._cachedDomainY[0])) /
        (scale.scale(_lastSeenDomainY[1]) - scale.scale(_lastSeenDomainY[0])) || 1;
      _deltaY = scale.scale(this._cachedDomainY[0]) - scale.scale(_lastSeenDomainY[0]) * _scalingY || 0;

      _registerDeferredRendering();
    };

    this._renderCallback = (scale) => {
      if (this.deferredRendering() && this.x() && this.x().scale === scale) {
        _lazyDomainChangeCallbackX(scale);
      } else if (this.deferredRendering() && this.y() && this.y().scale === scale) {
        _lazyDomainChangeCallbackY(scale);
      } else {
        this.render();
      }
    };
  }

  /**
   * Returns the whether or not the rendering is deferred for performance boost.
   * @return {boolean} The deferred rendering option
   */
  public deferredRendering(): boolean;
  /**
   * Sets / unsets the deferred rendering option
   * Activating this option improves the performance of plot interaction (pan / zoom) by
   * performing lazy renders, only after the interaction has stopped. Because re-rendering
   * is no longer performed during the interaction, the zooming might experience a small
   * resolution degradation, before the lazy re-render is performed.
   *
   * This option is intended for cases where performance is an issue.
   */
  public deferredRendering(deferredRendering: boolean): XYPlot<X, Y>;
  public deferredRendering(deferredRendering?: boolean): any {
    if (deferredRendering == null) {
      return this._deferredRendering;
    }

    if (deferredRendering) {
      if (this.x() && this.x().scale) {
        this._cachedDomainX = this.x().scale.domain();
      }
      if (this.y() && this.y().scale) {
        this._cachedDomainY = this.y().scale.domain();
      }
    }

    this._deferredRendering = deferredRendering;
    return this;
  }

  /**
   * Gets the AccessorScaleBinding for X.
   */
  public x(): Plots.AccessorScaleBinding<X, number>;
  /**
   * Sets X to a constant number or the result of an Accessor<number>.
   *
   * @param {number|Accessor<number>} x
   * @returns {XYPlot} The calling XYPlot.
   */
  public x(x: number | Accessor<number>): XYPlot<X, Y>;
  /**
   * Sets X to a scaled constant value or scaled result of an Accessor.
   * The provided Scale will account for the values when autoDomain()-ing.
   *
   * @param {X|Accessor<X>} x
   * @param {Scale<X, number>} xScale
   * @returns {XYPlot} The calling XYPlot.
   */
  public x(x: X | Accessor<X>, xScale: Scale<X, number>): XYPlot<X, Y>;
  public x(x?: number | Accessor<number> | X | Accessor<X>, xScale?: Scale<X, number>): any {
    if (x == null) {
      return this._propertyBindings.get(XYPlot._X_KEY);
    }
    this._bindProperty(XYPlot._X_KEY, x, xScale);
    if (this._autoAdjustYScaleDomain) {
      this._updateYExtentsAndAutodomain();
    }

    this.render();
    return this;
  }

  /**
   * Gets the AccessorScaleBinding for Y.
   */
  public y(): Plots.AccessorScaleBinding<Y, number>;
  /**
   * Sets Y to a constant number or the result of an Accessor<number>.
   *
   * @param {number|Accessor<number>} y
   * @returns {XYPlot} The calling XYPlot.
   */
  public y(y: number | Accessor<number>): XYPlot<X, Y>;
  /**
   * Sets Y to a scaled constant value or scaled result of an Accessor.
   * The provided Scale will account for the values when autoDomain()-ing.
   *
   * @param {Y|Accessor<Y>} y
   * @param {Scale<Y, number>} yScale
   * @returns {XYPlot} The calling XYPlot.
   */
  public y(y: Y | Accessor<Y>, yScale: Scale<Y, number>): XYPlot<X, Y>;
  public y(y?: number | Accessor<number> | Y | Accessor<Y>, yScale?: Scale<Y, number>): any {
    if (y == null) {
      return this._propertyBindings.get(XYPlot._Y_KEY);
    }

    this._bindProperty(XYPlot._Y_KEY, y, yScale);
    if (this._autoAdjustXScaleDomain) {
      this._updateXExtentsAndAutodomain();
    }

    this.render();
    return this;
  }

  protected _filterForProperty(property: string) {
    if (property === "x" && this._autoAdjustXScaleDomain) {
      return this._makeFilterByProperty("y");
    } else if (property === "y" && this._autoAdjustYScaleDomain) {
      return this._makeFilterByProperty("x");
    }
    return null;
  }

  private _makeFilterByProperty(property: string) {
    var binding = this._propertyBindings.get(property);
    if (binding != null) {
      var accessor = binding.accessor;
      var scale = binding.scale;
      if (scale != null) {
        return (datum: any, index: number, dataset: Dataset) => {
          var range = scale.range();
          return Utils.Math.inRange(scale.scale(accessor(datum, index, dataset)), range[0], range[1]);
        };
      }
    }
    return null;
  }

  protected _uninstallScaleForKey(scale: Scale<any, any>, key: string) {
    super._uninstallScaleForKey(scale, key);
    var adjustCallback = key === XYPlot._X_KEY ? this._adjustYDomainOnChangeFromXCallback
                                               : this._adjustXDomainOnChangeFromYCallback;
    scale.offUpdate(adjustCallback);
  }

  protected _installScaleForKey(scale: Scale<any, any>, key: string) {
    super._installScaleForKey(scale, key);
    var adjustCallback = key === XYPlot._X_KEY ? this._adjustYDomainOnChangeFromXCallback
                                               : this._adjustXDomainOnChangeFromYCallback;
    scale.onUpdate(adjustCallback);
  }

  public destroy() {
    super.destroy();
    if (this.x().scale) {
      this.x().scale.offUpdate(this._adjustYDomainOnChangeFromXCallback);
    }
    if (this.y().scale) {
      this.y().scale.offUpdate(this._adjustXDomainOnChangeFromYCallback);
    }
    return this;
  }

  /**
   * Gets the automatic domain adjustment mode for visible points.
   */
  public autorangeMode(): string;
  /**
   * Sets the automatic domain adjustment mode for visible points to operate against the X Scale, Y Scale, or neither.
   * If "x" or "y" is specified the adjustment is immediately performed.
   *
   * @param {string} autorangeMode One of "x"/"y"/"none".
   *   "x" will adjust the x Scale in relation to changes in the y domain.
   *   "y" will adjust the y Scale in relation to changes in the x domain.
   *   "none" means neither Scale will change automatically.
   * @returns {XYPlot} The calling XYPlot.
   */
  public autorangeMode(autorangeMode: string): XYPlot<X, Y>;
  public autorangeMode(autorangeMode?: string): any {
    if (autorangeMode == null) {
      if (this._autoAdjustXScaleDomain) {
        return "x";
      }
      if (this._autoAdjustYScaleDomain) {
        return "y";
      }
      return "none";
    }
    switch (autorangeMode) {
      case "x":
        this._autoAdjustXScaleDomain = true;
        this._autoAdjustYScaleDomain = false;
        this._adjustXDomainOnChangeFromY();
        break;
      case "y":
        this._autoAdjustXScaleDomain = false;
        this._autoAdjustYScaleDomain = true;
        this._adjustYDomainOnChangeFromX();
        break;
      case "none":
        this._autoAdjustXScaleDomain = false;
        this._autoAdjustYScaleDomain = false;
        break;
      default:
        throw new Error("Invalid scale name '" + autorangeMode + "', must be 'x', 'y' or 'none'");
    }
    return this;
  }

  public computeLayout(origin?: Point, availableWidth?: number, availableHeight?: number) {
    super.computeLayout(origin, availableWidth, availableHeight);
    var xBinding = this.x();
    var xScale = xBinding && xBinding.scale;
    if (xScale != null) {
      xScale.range([0, this.width()]);
    }
    var yBinding = this.y();
    var yScale = yBinding && yBinding.scale;
    if (yScale != null) {
      if (this.y().scale instanceof Scales.Category) {
        this.y().scale.range([0, this.height()]);
      } else {
        this.y().scale.range([this.height(), 0]);
      }
    }
    return this;
  }

  private _updateXExtentsAndAutodomain() {
    this._updateExtentsForProperty("x");
    var xScale = this.x().scale;
    if (xScale != null) {
      xScale.autoDomain();
    }
  }

  private _updateYExtentsAndAutodomain() {
    this._updateExtentsForProperty("y");
    var yScale = this.y().scale;
    if (yScale != null) {
      yScale.autoDomain();
    }
  }

  /**
   * Adjusts the domains of both X and Y scales to show all data.
   * This call does not override the autorange() behavior.
   *
   * @returns {XYPlot} The calling XYPlot.
   */
  public showAllData() {
    this._updateXExtentsAndAutodomain();
    this._updateYExtentsAndAutodomain();
    return this;
  }

  private _adjustYDomainOnChangeFromX() {
    if (!this._projectorsReady()) { return; }
    if (this._autoAdjustYScaleDomain) {
      this._updateYExtentsAndAutodomain();
    }
  }
  private _adjustXDomainOnChangeFromY() {
    if (!this._projectorsReady()) { return; }
    if (this._autoAdjustXScaleDomain) {
      this._updateXExtentsAndAutodomain();
    }
  }

  protected _projectorsReady() {
    var xBinding = this.x();
    var yBinding = this.y();
    return xBinding != null &&
        xBinding.accessor != null &&
        yBinding != null &&
        yBinding.accessor != null;
  }

  protected _pixelPoint(datum: any, index: number, dataset: Dataset): Point {
    var xProjector = Plot._scaledAccessor(this.x());
    var yProjector = Plot._scaledAccessor(this.y());
    return { x: xProjector(datum, index, dataset), y: yProjector(datum, index, dataset) };
  }

  protected _getDataToDraw() {
    var dataToDraw: Utils.Map<Dataset, any[]> = super._getDataToDraw();

    var definedFunction = (d: any, i: number, dataset: Dataset) => {
      var positionX = Plot._scaledAccessor(this.x())(d, i, dataset);
      var positionY = Plot._scaledAccessor(this.y())(d, i, dataset);
      return Utils.Math.isValidNumber(positionX) &&
             Utils.Math.isValidNumber(positionY);
    };

    this.datasets().forEach((dataset) => {
      dataToDraw.set(dataset, dataToDraw.get(dataset).filter((d, i) => definedFunction(d, i, dataset)));
    });
    return dataToDraw;
  }
}
}