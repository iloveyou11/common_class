const child_process = require("child_process");
const fs = require("fs");
const inspect = require("eyes").inspector({
    maxLength: false,
});
const geoserver = process.env.GEOSERVER_DATA_DIR; //geoserver数据存储目录，用环境变量获取

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
}

/**curl GET请求封装
 * @param {string} url geoserver路径
 * @callback cb callback()
 */
shpManager.prototype.GET = function(url, cb) {
    let cmd = `curl -v -u ${this.user}:${this.password} -XGET ${url}`;
    child_process.exec(cmd, function(err, stdout, stderr) {
        if (stdout.indexOf("No such") > -1) {
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
shpManager.prototype.POST = function(data, url, cb, storename, type = 0) {
    let cmd = `curl -v -u ${this.user}:${
		this.password
	} -XPOST -H "Content-type: text/xml" -d `
    if (type == 1) cmd = `${cmd} @"${data}" ${url}`;
    else cmd = `${cmd} "${data}" ${url}`;
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
shpManager.prototype.PUT = function(data, url, cb, type, content = "text/xml") {
    let cmd = `curl -v -u ${this.user}:${this.password} -XPUT -H "Content-type: ${content}" -d `;
    if (type == 1) cmd = `${cmd} @"${data}" ${url}`;
    else cmd = `${cmd} "${data}" ${url}`;
    child_process.exec(cmd, function(err, stdout, stderr) {
        inspect(stdout);
        inspect(cmd);
        if (stdout == "") cb(true);
        else cb(false);
    });
};

shpManager.prototype.getStyle = function(style, cb) {
    let url = `${this._geoserverurl}/workspaces/${this.ws}/styles/${style}.xml`;
    shpManager.GET(url, cb);
}

shpManager.prototype.publishStyle = function(path, style, cb) {
    let geopath = `${geoserver}/workspaces/${this.ws}/styles/${style}.sld`; //利用环境变量获取geoserver存储路径
    copyFile(path, geopath);
    let xml1 = `<style><name>${style}</name><filename>${style}.sld</filename></style>`;
    let url1 = `${this._geoserverurl}/workspaces/${this.ws}/styles`;
    shpManager.POST(xml1, url1, (info) => {
        if (info) {
            let url2 = `${url1}/${style}`;
            shpManager.PUT(geopath, url2, cb, 1, 'application/vnd.ogc.sld+xml');
        }
    }, style);
};

shpManager.prototype.updateStyle = function(path, style, cb) {
    let geopath = `${geoserver}/workspaces/${this.ws}/styles/${style}.sld`;
    copyFile(path, geopath);
    let url2 = `${this._geoserverurl}/workspaces/${this.ws}/styles/${style}`;
    shpManager.PUT(geopath, url2, cb, 1, 'application/vnd.ogc.sld+xml');
}


var shpManager = new shpManager({
    ip: "localhost",
    port: "8080",
    user: "admin",
    password: "geoserver",
    ws: "land",
});

/**
 * 发布（更新style）
 * @param {string} style style名称
 * @param {string} path style路径
 */
const publishStyle = (style, path) => {
    shpManager.getStyle(style, info => {
        if (info) {
            shpManager.updateStyle(path, style, info => {
                if (info)
                    console.log(`${style}更新成功`);
                else
                    console.log(`${style}更新失败`);
            });
        } else {
            shpManager.publishStyle(path, style, info => {
                if (info)
                    console.log(`${style}发布成功`);
                else
                    console.log(`${style}发布失败`);
            })
        }
    })
};

/**
 * 上传文件夹中的style
 * @param {string} xmlpath style存储路径
 */
const PublishFolder = (xmlpath) => {
    fs.readdir(xmlpath, (err, files) => {
        if (!err) {
            files.forEach(file => {
                let path = `${xmlpath}/${file}`;
                fs.stat(path, (err, stats) => {
                    if (err) {
                        console.log(err, `读取${path}文件状态失败`);
                    } else {
                        if (!stats.isDirectory()) {
                            let stylename = file.substring(0, file.lastIndexOf('.'));
                            publishStyle(stylename, path);
                        } else {
                            PublishFolder(path);
                        }
                    }
                })
            });
        }
    })
};

/**
 * @description 复制文件
 * @param {string} oldFile 源文件
 * @param {string} newFile 新文件
 */
const copyFile = (oldFile, newFile) => {
    try {
        //去除文件BOM头，解决乱码问题
        var bin = fs.readFileSync(oldFile);
        if (bin[0] === 0xEF && bin[1] === 0xBB && bin[2] === 0xBF) {
            bin = bin.slice(3);
        }

        fs.writeFileSync(newFile, bin.toString('utf-8'), {
            encoding: 'utf8'
        });
    } catch (error) {
        inspect(error, `复制文件${oldFile}失败`);
    }
};


PublishFolder("C:\\Users\\杨佩\\Desktop\\项目\\shp+style汇总\\源\\backmap-new-total4\\xml");