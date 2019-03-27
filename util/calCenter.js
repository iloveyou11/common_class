const mysql = require("mysql");
const inspect = require("eyes").inspector({
    maxLength: false,
});
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
        let EIDs = [],
            centerX = [],
            centerY = [];
        connection.query("select EID,extent from extent", (err, result) => {
            for (const key in result) {
                const element = result[key];
                let EID = element['EID'],
                    extent = element['extent'];
                extent = JSON.parse(extent);
                let x = (extent['minX'] + extent['maxX']) / 2;
                let y = (extent['minY'] + extent['maxY']) / 2;
                EIDs.push(EID);
                centerX.push(x);
                centerY.push(y);
            }

            let res = [];
            for (const key in EIDs) {
                res.push({
                    EID: EIDs[key],
                    centerX: centerX[key],
                    centerY: centerY[key]
                })
            }
            for (const key in res) {
                if (res.hasOwnProperty(key)) {
                    const element = res[key];
                    connection.query('update extent set ? where EID=?', [element, element['EID']], (err, result) => {
                        if (err) {
                            inspect(err, '更新数据出错');
                        } else {
                            inspect('更新数据成功');
                        }
                    })
                }
            }
        })
    }
});