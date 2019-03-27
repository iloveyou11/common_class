const mysql = require("mysql");
const inspect = require("eyes").inspector({
    maxLength: false,
});
const fs = require('fs');

//使用数据库连接池
const mysqlCofig = {
    host: "localhost",
    port: 3306,
    database: "test4",
    user: "root",
    password: "574820ypczjs",
};

const pool = mysql.createPool(mysqlCofig);
pool.getConnection(function(err, connection) {
    //通过getConnection()方法进行数据库连接
    if (err) {
        console.log(`mysql链接失败${err}`);
    } else {
        connection.query("select code,landId,extent from rel_insti,extent WHERE rel_insti.landId=extent.id", (err, result) => {
            if (!err) {
                let maxextent = [],
                    did = [];
                for (const key in result) {
                    if (result.hasOwnProperty(key)) {
                        const element = result[key];
                        if (!did.includes(element.code)) {
                            did.push(element.code);
                            maxextent.push(element.extent);
                        } else {
                            let maxVal = JSON.parse(maxextent[did.indexOf(element.code)]);
                            for (const key in maxVal) {
                                if (maxVal.hasOwnProperty(key)) {
                                    let extent = JSON.parse(element['extent']);
                                    if (key.includes('min')) {
                                        maxVal[key] = Math.min(maxVal[key], extent[key]);
                                    } else {
                                        maxVal[key] = Math.max(maxVal[key], extent[key]);
                                    }
                                }
                            }
                            maxextent[did.indexOf(element.code)] = JSON.stringify(maxVal);
                        }
                    }
                }
                let res = [];
                for (const key in did) {
                    if (did.hasOwnProperty(key)) {
                        res.push({
                            instiCode: did[key],
                            extent: maxextent[key]
                        })
                    }
                }
                // let sql = '';
                for (const key in res) {
                    if (res.hasOwnProperty(key)) {
                        const instiCode = res[key]['instiCode'];
                        const extent = res[key]['extent'];
                        // sql += `update institution set extent='${extent}' where instiCode='${instiCode}';`;
                        connection.query('update institution set extent=? where instiCode=?', [extent, instiCode], (err, result) => {
                            if (err) {
                                inspect(err, '更新数据出错');
                            } else {
                                inspect('更新数据成功');
                            }
                        })
                    }

                }
                // fs.writeFile('./content.sql', sql, { flag: 'w', encoding: 'utf-8', mode: '0666' }, function(err) {
                //     if (err) {
                //         console.log("文件写入失败")
                //     } else {
                //         console.log("文件写入成功");

                //     }
                // })

                // connection.query(sql, (err, result) => {
                //     if (err) {
                //         inspect(err, '更新数据出错');
                //     } else {
                //         inspect('更新数据成功');
                //     }
                // });


            }
        });
    }
});