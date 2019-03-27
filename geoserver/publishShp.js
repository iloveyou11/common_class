const child_process = require("child_process");
const xml2js = require("xml2js");
const fs = require("fs");
const inspect = require("eyes").inspector({
    maxLength: false,
});
const gdal = require("gdal");
const glob = require("glob");

const FieldType = {
    string: "java.lang.String",
    real: "java.lang.Double",
    integer: "java.lang.Integer",
};

/**
 *构建一个shp管理类
 * @param {*} options
 * @class shpManager
 */
function shpManager(options) {
    this.ip = options.ip;
    this.port = options.port;
    this._geoserverurl = `http://${this.ip}:${this.port}/geoserver/rest`;
    this.user = options.user; //geoserver的用户名
    this.password = options.password; //geoserver的用户密码
    this.layer = options.layer;
    this.ws = options.ws !== undefined ? options.ws : "land"; //工作区间，默认是shp工作区间
    this.storename = options.storename !== undefined ? options.storename : "D11"; //shp数据存储名称，默认是shpstore
    this.shpfile = options.shpfile; //shpfile xml路径
    this.layerxml = options.layerxml; //layer xml路径
    this.stylename = options.stylename; //style

    this.savepath = options.savepath; //xml存储路径
}

shpManager.prototype.setWs = function(ws) {
    this.ws = ws;
};

shpManager.prototype.setStorename = function(storename) {
    this.storename = storename;
};

shpManager.prototype.setLayer = function(layer) {
    this.layer = layer;
};

shpManager.prototype.setLayerXml = function(layerxml) {
    this.layerxml = layerxml;
};

shpManager.prototype.setshpfile = function(shpfile) {
    this.shpfile = shpfile;
};

shpManager.prototype.setStyle = function(stylename) {
    this.stylename = stylename;
};

/**curl GET请求封装
 * @param {string} url geoserver路径
 * @callback cb callback()
 */
shpManager.prototype.GET = function(url, cb) {
    let cmd = `curl -v -u ${this.user}:${this.password} -XGET ${url}`;
    child_process.exec(cmd, function(err, stdout, stderr) {
        inspect(stdout);
        if (stdout.indexOf("No such") > -1) {
            inspect('不存在')
            return cb(false);
        }
        //if (JSON.parse(stdout).dataStore.name == storename) cb(true);
        else cb(true);
    });
};
/**curl POST请求封装
 * @param {string}data xml
 * @param {string}url geoserver路径
 * @param {string} storename POST请求成功返回值
 * @callback cb
 */
shpManager.prototype.POST = function(data, url, cb, storename) {
    let cmd = `curl -v -u ${this.user}:${
		this.password
	} -XPOST -H "Content-type: text/xml" -d @"${data}" ${url}`;
    child_process.exec(cmd, function(err, stdout, stderr) {
        inspect(cmd);
        inspect(stdout);
        if (stdout == storename) cb(true);
        else cb(false);
    });
};
/**curl PUT请求封装
 * @param {string}data xml
 * @param {string}url geoserver路径
 * @param {number}type 1表示data为文件，0表示data为字符串
 * @callback cb
 */
shpManager.prototype.PUT = function(data, url, cb, type) {
    let cmd = `curl -v -u ${this.user}:${this.password} -XPUT -H "Content-type: text/xml" -d `;
    if (type == 1) cmd = `${cmd} @"${data}" ${url}`;
    else cmd = `${cmd} "${data}" ${url}`;
    child_process.exec(cmd, function(err, stdout, stderr) {
        inspect(stdout);
        inspect(cmd);
        if (stdout == "") cb(true);
        else cb(false);
    });
};

shpManager.prototype.DELETE = function(url, cb) {
    var cmd = `curl -v -u ${this.user}:${this.password} -XDELETE ${url}`;
    //  inspect(cmd);
    child_process.exec(cmd, function(err, stdout, stderr) {
        inspect(cmd);
        inspect(stdout);
        if (stdout == "") cb(true);
        else cb(false);
    });
};

//根据名称获取矢量数据存储
shpManager.prototype.getdataStorebyName = function(storename, cb) {
    let url = `${this._geoserverurl}/workspaces/${this.ws}/datastores/${storename}.json`;
    shpManager.GET(url, cb);
};
//发布一个矢量数据存储
shpManager.prototype.publishdataStore = function(datastore, cb) {
    let url = `${this._geoserverurl}/workspaces/${this.ws}/datastores`;
    inspect('发布数据存储')
    shpManager.POST(`${this.savepath}\\datastore\\${datastore}.xml`, url, cb, datastore);
};
//修改已发布的数据存储  datastores
shpManager.prototype.updatedataStore = function(datastore, cb) {
    let url = `${this._geoserverurl}/workspaces/${this.ws}/datastores/${datastore}`;
    shpManager.PUT(`${this.savepath}\\datastore\\${datastore}.xml`, url, cb, 1);
};

//发布一个图层
shpManager.prototype.publishLayer = function(layer, cb) {
    let url = `${this._geoserverurl}/workspaces/${this.ws}/datastores/${layer}/featuretypes`;
    shpManager.POST(`${this.savepath}\\layer\\${layer}.xml`, url, cb, "");
};

//更新一个图层
shpManager.prototype.updateLayer = function(layer, cb) {
    let url = `${this._geoserverurl}/workspaces/${
		this.ws
	}/datastores/${layer}/featuretypes/${layer}`;
    shpManager.PUT(`${this.savepath}\\layer\\${layer}.xml`, url, cb, 1);
};

//删除一个图层(不确定)
shpManager.prototype.deleteLayer = function(cb) {
    let url = `${this._geoserverurl}layers/${this.ws}:${this.layer}`;
    // inspect(url);
    shpManager.DELETE(url, cb);
};

//给发布的图层赋予样式(存疑)
shpManager.prototype.setLayerStyle = function(layer, style, cb) {
    let xml = `<layer><defaultStyle><name>${style}</name></defaultStyle></layer>`;
    let url = `${this._geoserverurl}/layers/${layer}`;
    shpManager.PUT(xml, url, cb, 0);
};

//发布图层组
shpManager.prototype.setLayerGroup = function(layergroups_xml, cb) {
    let url = `${this._geoserverurl}/layergroups`;
    var cmd = `curl -v -u ${this.user}:${
		this.password
	} -XPOST -H "Content-type: text/xml" -d @"${layergroups_xml}" ${url}`;
    inspect(cmd);
    child_process.exec(cmd, function(err, stdout, stderr) {
        if (stdout == "") cb(true);
        else cb(false);
    });
};

shpManager.prototype.CreatedataStoreXml = function(storename, shppath, xmlpath) {
    this.storename = storename;
    this.shpfile = `${this.savepath}\\${storename}.xml`;
    return new Promise((resolve, reject) => {
        let parser = new xml2js.Parser(); //用于把xml对象解析为json
        let builder = new xml2js.Builder(); //用于把json对象解析为xml
        fs.readFile(xmlpath, (err, data) => {
            parser.parseString(data, (err, result) => {
                for (key in result["dataStore"]) {
                    switch (key) {
                        case "name":
                        case "description":
                            result["dataStore"][key] = storename;
                            break;
                        case "connectionParameters":
                            result["dataStore"][key][0]["entry"][8]["_"] = `file://${shppath}`;
                            break;
                        case "featureTypes":
                            result["dataStore"][key][0]["atom:link"][0]["$"]["href"] = `http://${
								this.ip
							}:${this.port}/geoserver/rest/workspaces/${
								this.ws
							}/datastores/${storename}/featuretypes.xml`;
                        default:
                            break;
                    }
                }
                let outxml = builder.buildObject(result);
                fs.writeFile(`${this.savepath}\\datastore\\${storename}.xml`, outxml.toString(), (err1) => {
                    if (err1) {
                        return reject(err1);
                    } else {
                        return resolve();
                    }
                });
            });
        });
    });
};

shpManager.prototype.CreateLayerXml = function(layer, layername, xmlpath) {
    this.layer = layername;
    this.layerxml = `${this.savepath}\\${layername}.xml`;
    return new Promise((resolve, reject) => {
        let parser = new xml2js.Parser(); //用于把xml对象解析为json
        let builder = new xml2js.Builder(); //用于把json对象解析为xml
        fs.readFile(xmlpath, (err, data) => {
            if (!err) {
                parser.parseString(data, (err, result) => {
                    if (!err) {
                        for (key in result) {
                            var val = result[key];
                            for (key in val) {
                                let temp = val[key][0];
                                switch (key) {
                                    //name,nativeName,title均为文件名
                                    case "name":
                                    case "nativeName":
                                    case "title":
                                        val[key] = layername;
                                        break;
                                        //要素关键字
                                    case "keywords":
                                        temp["string"][1] = layername; //keywords: [{string: ['features', '1_1f_line']}]
                                        break;
                                        //边界范围
                                    case "nativeBoundingBox":
                                    case "latLonBoundingBox":
                                        let bounds = layer.getExtent();
                                        const name = ["minX", "maxX", "minY", "maxY"];
                                        let change = [1, -1];
                                        let index = 0;
                                        for (key in temp) {
                                            if (key != "crs")
                                                temp[key] = [
                                                    String(
                                                        bounds[name[index++]] + change[index % 2],
                                                    ),
                                                ];
                                        }

                                        break;
                                    case "attributes":
                                        temp["attribute"] = getAttributes(layer);
                                        break;
                                    case "store":
                                        temp["name"] = `${this.ws}:${layername}`;
                                        temp["ns0:link"][0]["$"]["href"] = `http://${this.ip}:${
											this.port
										}/geoserver/rest/workspaces/${
											this.ws
										}/datastores/${layername}.xml`;
                                        break;
                                    default:
                                        break;
                                }
                            }
                        }
                        let outxml = builder.buildObject(result);
                        try {
                            fs.writeFileSync(
                                `${this.savepath}\\layer\\${layername}.xml`,
                                outxml.toString(),
                            );
                            return resolve();
                        } catch (error) {
                            inspect(error, `${layername}xml 写入失败`);
                            return reject(error);
                        }
                    } else {
                        inspect(err, "xml转换错误");
                        return reject(err);
                    }
                });
            } else {
                inspect(err, "layerxml打开错误");
                return reject(err);
            }
        });
    });
};

//发布数据存储
const publishdataStore = (datastore) => {
    return new Promise((resolve, reject) => {
        shpManager.publishdataStore(datastore, (info) => {
            if (info) return resolve();
            else return reject(new Error(`数据存储${datastore}发布失败`));
        });
    });
};

//更新数据存储
const updatedataStore = (datastore) => {
    return new Promise((resolve, reject) => {
        shpManager.updatedataStore(datastore, (info) => {
            if (info) return resolve();
            else return reject(new Error(`数据存储${datastore}更新失败`));
        });
    });
};

//发布图层
const publishLayer = (layer) => {
    return new Promise((resolve, reject) => {
        shpManager.publishLayer(layer, (info) => {
            if (info) return resolve();
            else return reject(new Error(`图层${layer}发布失败`));
        });
    });
};

//更新图层
const updateLayer = (layer) => {
    return new Promise((resolve, reject) => {
        shpManager.updateLayer(layer, (info) => {
            if (info) return resolve();
            else return reject(new Error(`图层${layer}更新失败`));
        });
    });
};

//设置样式
const setLayerStyle = (layer, style) => {
    return new Promise((resolve, reject) => {
        shpManager.setLayerStyle(layer, style, (info) => {
            if (info) return resolve();
            else return reject(new Error(`${layer}设置样式为${layer}失败`));
        });
    });
};

/**
 * @description 若已存在数据存储，更新，若不存在，发布新的
 * @param {string} datastore 数据存贮名字
 * @param {string} layer 图层名字
 */
const publish = (datastore, layer) => {
    shpManager.getdataStorebyName(datastore, async function(info) {
        if (info) {
            setTimeout(() => {
                updatedataStore(datastore)
                    .then(() => {
                        return updateLayer(layer);
                    })
                    .then(() => {
                        return setLayerStyle(layer, layer);
                    })
                    .catch((error) => {
                        inspect(error, `更新${datastore}过程出错`);
                    });
            }, 0);
        } else {
            setTimeout(() => {
                publishdataStore(datastore)
                    .then(() => {
                        return publishLayer(layer);
                    })
                    .then(() => {
                        return setLayerStyle(layer, layer);
                    })
                    .catch((error) => {
                        inspect(error, `发布${datastore}过程出错`);
                    });
            }, 0);
        }
    });
};

/**
 * @description 构建xml中的属性表
 * @param {Layer} layer 图层？
 */
const getAttributes = (layer) => {
    let attributes = [{
        name: ["the_geom"],
        minOccurs: ["0"],
        maxOccurs: ["1"],
        nillable: ["true"],
        binding: ["com.vividsolutions.jts.geom.MultiPolygon"],
    }, ];
    layer.fields.map((field, i) =>
        attributes.push({
            name: [field["name"]],
            minOccurs: ["0"],
            maxOccurs: ["1"],
            nillable: ["true"],
            binding: [FieldType[field["type"]]],
            length: [String(field["width"])],
        }),
    );
    return attributes;
};

/**
 * @description 从指定文件夹筛选出shp文件
 * @param {string} path 要搜索的文件夹
 */
const getshpfile = (path) => {
    return new Promise((resolve, reject) =>
        glob(
            path, {
                nonull: false,
            },
            (err, files) => {
                if (err) {
                    inspect(err, "筛选shp失败");
                    return reject(err);
                } else {
                    if (files.length === 0) {
                        return reject(new Error("所查找的文件不存在"));
                    } else return resolve(files);
                }
            },
        ),
    );
};

/**
 * @description 读取shp文件，得到dataset
 * @param {string} filepath shp文件路径
 */
const readShp = (filepath) => {
    return new Promise((resolve, reject) => {
        try {
            const dataset = gdal.open(filepath, "r+", "ESRI Shapefile");
            return resolve(dataset);
        } catch (error) {
            return reject(error);
        }
    });
};

var shpManager = new shpManager({
    ip: "localhost",
    port: "8080",
    user: "admin",
    password: "geoserver",
    ws: "land",
    savepath: "C:\\Users\\杨佩\\Desktop\\项目\\shp+style汇总\\底图批量发布3\\savepath",

    //下面几个不生效，没搞定同步异步问题
    storename: "D11",
    layer: "D11",
    shpfile: "",
    layerxml: "",
    stylename: "area",
});

const PublishFolder = (shppath, datastorexml, layerxml) => {
    getshpfile(`${shppath}/*.shp`).then((files) => {
        return Promise.all(
                files.map((file) => {
                    let name = file.substring(file.lastIndexOf('/') + 1, file.lastIndexOf("."));
                    shpManager
                        .CreatedataStoreXml(name, file, datastorexml)
                        .then(() => {
                            inspect(`${name}数据存储创建成功`)
                            return readShp(file);
                        })
                        .then((dataset) => {
                            inspect(`${name}图层创建成功`);
                            return shpManager.CreateLayerXml(dataset.layers.get(0), name, layerxml);
                        })
                        .then(() => {
                            inspect(`${name}开始发布`);
                            publish(name, name);
                        })
                        .catch((error) => {
                            inspect(error);
                        });
                }),
            )
            .then(() => {})
            .catch((error) => inspect(error));
    });
};

PublishFolder("C:\\Users\\杨佩\\Desktop\\项目\\shp+style汇总\\源\\backmap-new-total4\\shp", "public/xml/datastore.xml", "public/xml/layer.xml")