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
        connection.query("select * from extent", (err, result) => {
            if (!err) {
                let maxextent = [],
                    did = [];

                for (const key in result) {
                    if (result.hasOwnProperty(key)) {
                        const element = result[key];
                        if (!did.includes(element.DID)) {
                            did.push(element.DID);
                            maxextent.push(element.extent);
                        } else {
                            let maxVal = JSON.parse(maxextent[did.indexOf(element.DID)]);
                            //inspect(maxVal,'val')
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
                            maxextent[did.indexOf(element.DID)] = JSON.stringify(maxVal);
                        }
                    }

                }
                let res = [];
                for (const key in did) {
                    if (did.hasOwnProperty(key)) {
                        res.push({
                            id: did[key],
                            extent: maxextent[key]
                        })
                    }
                }
                for (const key in res) {
                    if (res.hasOwnProperty(key)) {
                        const element = res[key];
                        connection.query('insert into extent set ?', element, (err, result) => {
                            if (err) {
                                inspect(err, '插入数据出错');
                            } else {
                                inspect('插入数据成功');
                                //connection.release();
                            }
                        })
                    }
                }
            }
        });
    }
});