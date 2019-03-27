class Map {
    /**
     * @function 绘制点
     * @param {Object} map 地图对象
     * @param {Number} x x坐标
     * @param {Number} y y坐标
     * @param {String} fillColor 填充色 
     * @param {String} strokeColor 边线颜色
     * @param {String} imageColor 图案颜色
     */
    drawPoint(map, x, y, fillColor = '#000', strokeColor = '#000', imageColor = '#000') {
        let point = new ol.Feature({
            geometry: new ol.geom.Point([x, y])
        });
        point.setStyle(new ol.style.Style({
            fill: new ol.style.Fill({
                color: fillColor
            }),
            stroke: new ol.style.Stroke({
                color: strokeColor,
                width: 1
            }),
            image: new ol.style.Circle({
                radius: 8,
                fill: new ol.style.Fill({
                    color: imageColor
                })
            })
        }));
        let source = new ol.source.Vector({
            features: [point]
        });
        let vector = new ol.layer.Vector({
            source: source
        });
        map.addLayer(vector);
    }

    /**
     * 
     * @param {Object} map 地图
     * @param {Array} startPoint 起始点坐标
     * @param {Array} endPoint 结束点坐标
     */
    drawStaticLine(map, startPoint, endPoint, fillColor = '#000', strokeColor = '#000', imageColor = '#000') {
        //创建一个线
        let Line = new ol.Feature({
            geometry: new ol.geom.LineString([startPoint, endPoint])
        });

        //设置线的样式
        Line.setStyle(new ol.style.Style({
            //填充色
            fill: new ol.style.Fill({
                color: fillColor
            }),
            //边线颜色
            stroke: new ol.style.Stroke({
                lineDash: [1, 4],
                color: strokeColor,
                width: 2
            }),
            //形状
            image: new ol.style.Circle({
                radius: 7,
                fill: new ol.style.Fill({
                    color: imageColor
                })
            })
        }));
        let source = new ol.source.Vector({
            features: [Line]
        });
        let vector = new ol.layer.Vector({
            source: source
        });
        map.addLayer(vector);
    }

    /**
     * 
     * @param {Object} map 
     * @param {Array} center 中心点坐标
     * @param {Array} others 其余点坐标
     */
    drawDynamicLine(map, center, others) {
        let style = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: '#EAE911',
                width: 2
            })
        });
        let flightsSource;
        let addLater = function(feature, timeout) {
            window.setTimeout(function() {
                feature.set('start', new Date().getTime());
                flightsSource.addFeature(feature);
            }, timeout);
        };
        let pointsPerMs = 0.1;
        let animateFlights = function(event) {
            let vectorContext = event.vectorContext;
            let frameState = event.frameState;
            vectorContext.setStyle(style);
            let features = flightsSource.getFeatures();
            for (let i = 0; i < features.length; i++) {
                let feature = features[i];
                if (!feature.get('finished')) {
                    let coords = feature.getGeometry().getCoordinates();
                    let elapsedTime = frameState.time - feature.get('start');
                    let elapsedPoints = elapsedTime * pointsPerMs;
                    if (elapsedPoints >= coords.length) {
                        feature.set('finished', true);
                    }
                    let maxIndex = Math.min(elapsedPoints, coords.length);
                    let currentLine = new ol.geom.LineString(coords.slice(0, maxIndex));
                    //根据要素来描绘出线条
                    vectorContext.drawGeometry(currentLine);
                }
            }
            //继续动画效果
            map.render();
        };
        flightsSource = new ol.source.Vector({
            wrapX: false,
            loader: function() {
                for (let i = 0; i < others.length; i++) {
                    let from = center[0];
                    let to = others[i];
                    //创建一个两个地点之间的弧段
                    let arcGenerator = new arc.GreatCircle({
                        x: from[1],
                        y: from[0]
                    }, {
                        x: to[1],
                        y: to[0]
                    });

                    let arcLine = arcGenerator.Arc(100, {
                        offset: 10
                    });
                    if (arcLine.geometries.length === 1) {
                        let line = new ol.geom.LineString(arcLine.geometries[0].coords);
                        line.transform(ol.proj.get('EPSG:4326'), ol.proj.get('EPSG:3857'));

                        let feature = new ol.Feature({
                            geometry: line,
                            finished: false
                        });
                        //添加动画的特性与延迟所有功能并不在同一时间开始
                        addLater(feature, i * 50);
                    }
                }
                map.on('postcompose', animateFlights);
            }
        });

        let flightsLayer = new ol.layer.Vector({
            source: flightsSource,
            style: function(feature) {
                //如果动画仍然是活跃的特性,不渲染图层样式的特性
                if (feature.get('finished')) {
                    return style;
                } else {
                    return null;
                }
            }
        });
        map.addLayer(flightsLayer);
    }

    // 为非中心点创建注记
    createOtherLabelStyle(feature) {
        return new ol.style.Style({
            text: new ol.style.Text({
                //位置
                textAlign: 'center',
                //基准线
                textBaseline: 'middle',
                //文字样式
                font: 'normal 10px 微软雅黑',
                //文本内容
                text: feature.get('name'),
                //文本填充样式（即文字颜色）
                fill: new ol.style.Fill({
                    color: '#aa3300'
                }),
                stroke: new ol.style.Stroke({
                    color: '#ffcc33',
                    width: 1
                })
            })
        });
    }

    // 为中心点创建注记
    createCenterLabelStyle(feature) {
        return new ol.style.Style({
            text: new ol.style.Text({
                //位置
                textAlign: 'center',
                //基准线
                textBaseline: 'middle',
                //文字样式
                font: 'normal 18px 微软雅黑',
                //文本内容
                text: feature.get('name'),
                fill: new ol.style.Fill({
                    color: '#104E8B'
                }),
                stroke: new ol.style.Stroke({
                    color: '#104E8B',
                    width: 1
                })
            })
        });
    }

    createIconStyle(feature, src) {
        return new ol.style.Style({
            /**{olx.style.IconOptions}类型*/
            image: new ol.style.Icon(
                ({
                    anchor: [0.5, 60],
                    anchorOrigin: 'top-right',
                    anchorXUnits: 'fraction',
                    anchorYUnits: 'pixels',
                    offsetOrigin: 'top-right',
                    opacity: 0.75,
                    src: src
                })
            )
        });
    }

    /**
     * @description 添加图层注记
     * @param {*} map 地图
     * @param {*} point 点
     * @param {*} name 名称
     * @param {*} type 类型
     */
    mark(map, point, name, type) {
        let iconFeature = new ol.Feature({
            geometry: new ol.geom.Point(point),
            name: name,
        });
        if (type === 1) {
            iconFeature.setStyle(this.createCenterLabelStyle(iconFeature))
        } else {
            iconFeature.setStyle(this.createOtherLabelStyle(iconFeature));
        }
        let vectorSource = new ol.source.Vector({
            features: [iconFeature]
        });
        let vectorLayer = new ol.layer.Vector({
            source: vectorSource
        });
        map.addLayer(vectorLayer);
    }

    /**
     * @description 为中心点添加icon
     * @param {*} map 
     * @param {*} point 
     */
    addIcon(map, point, imgSrc) {
        let iconFeature = new ol.Feature({
            geometry: new ol.geom.Point(point)
        });
        iconFeature.setStyle(this.createIconStyle(iconFeature, imgSrc));
        let vectorSource = new ol.source.Vector({
            features: [iconFeature]
        });
        let vectorLayer = new ol.layer.Vector({
            source: vectorSource
        });
        map.addLayer(vectorLayer);
    }
}

export default new Map()