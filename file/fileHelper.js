const fs = require('fs')
const path = require('path')
const unzip = require("unzip")
const AdmZip = require("adm-zip")

class File {
    //递归创建目录 同步方法
    mkdirsSync(dirname) {
        if (fs.existsSync(dirname)) {
            return true
        } else {
            if (mkdirsSync(path.dirname(dirname))) {
                fs.mkdirSync(dirname)
                return true
            }
        }
    }

    //递归创建目录 异步方法
    mkdirs(dirname, callback) {
        fs.exists(dirname, function(exists) {
            if (exists) {
                callback()
            } else {
                //console.log(path.dirname(dirname))
                mkdirs(path.dirname(dirname), function() {
                    fs.mkdir(dirname, callback)
                })
            }
        })
    }

    /**
     *同步创建文件夹
     *
     * @param {string[]} folders 要创建的文件夹，由键值对表示
     */
    createFolderSync(...folders) {
        Promise.all(folders.map(folder => {
            for (const key in folder) {
                if (folder[key] != "") mkdirsSync(folder[key])
            }
        }))
    }

    /**
     *异步创建文件夹
     *
     * @param {string[]} folders 要创建的文件夹，由键值对表示
     */
    createFolder(...folders) {
        Promise.all(folders.map(folder => {
            for (const key in folder) {
                if (folder[key] != "")
                    mkdirs(folder[key], () => {
                        console.log(`${folder[key]}已存在`)
                    })
            }
        }))
    }

    /**
     * @description 递归删除文件夹
     * @param {string} path 要删除的文件夹
     */
    deleteFolderRecursiveSync(path) {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach((file) => {
                let curPath = `${path}/${file}`
                if (fs.statSync(curPath).isDirectory()) {
                    // recurse
                    deleteFolderRecursiveSync(curPath)
                } else {
                    deleteFileSync(curPath)
                }
            })
            fs.rmdirSync(path)
        }
    }

    /**
     * @description 同步删除文件
     * @param {string} file 文件路径
     */
    deleteFileSync(file) {
        if (fs.existsSync(file)) {
            try {
                fs.unlinkSync(file)
            } catch (error) {
                console.log(error, `删除${file}失败`)
            }
        }
    }

    /**
     * @description 异步删除文件
     * @param {string} file 文件路径
     */
    deleteFile(file) {
        fs.exists(file, (exists) => {
            if (exists) {
                fs.unlink(file, (err) => {
                    if (err) {
                        console.log(`删除${file}失败`)
                    }
                })
            }
        })
    }

    /**
     * @description 同步移动文件夹中的文件
     * @param {string} oldPath 源文件夹
     * @param {string} newPath 目标文件夹
     */
    async moveFolderFileSync(oldPath, newPath) {
        try {
            fs.readdirSync(oldPath).forEach((file) => {
                if (!fs.statSync(`${oldPath}\\${file}`).isDirectory())
                    fs.renameSync(`${oldPath}\\${file}`, `${newPath}\\${file}`)
            })
        } catch (error) {
            console.log(error, `移动文件夹${oldPath}失败`)
        }
    }

    /**
     * @description 异步移动文件夹中的文件
     * @param {string} oldPath 源文件夹
     * @param {string} newPath 目标文件夹
     */
    moveFolderFile(oldPath, newPath) {
        fs.readdir(oldPath, (err, files) => {
            if (!err)
                files.forEach((file) => {
                    fs.stat(`${oldPath}\\${file}`, (err, stats) => {
                        if (err) {
                            console.log(err, `读取${oldPath}\\${file}文件状态失败`)
                        } else {
                            if (!stats.isDirectory()) {
                                try {
                                    fs.rename(`${oldPath}\\${file}`, `${newPath}\\${file}`)
                                } catch (error) {
                                    console.log(error, `移动${oldPath}\\${file}失败`)
                                }
                            }
                        }
                    })
                })
        })
    }

    /**
     * @description 同步复制文件夹
     * @param {string} oldPath 源文件夹
     * @param {string} newPath 目标文件夹
     */
    async moveFolderSync(oldPath, newPath) {
        if (fs.existsSync(newPath)) {
            deleteFolderRecursiveSync(newPath)
        }
        try {
            fs.renameSync(oldPath, newPath)
        } catch (error) {
            console.log(error, `${oldPath}移动失败`)
        }
    }

    /**
     * @description 异步复制文件夹
     * @param {string} oldPath 源文件夹
     * @param {string} newPath 目标文件夹
     */
    moveFolder(oldPath, newPath) {
        fs.exists(newPath, (exists) => {
            if (exists) {
                deleteFolderRecursiveSync(oldPath)
            }
            fs.rename(oldPath, newPath, (err) => {
                if (err) {
                    console.log(err, `${oldPath}移动失败`)
                }
            })
        })

    }

    /**
     * @description 同步复制文件
     * @param {string} oldFile 源文件
     * @param {string} newFile 新文件
     */
    async copyFileSync(oldFile, newFile) {
        try {
            fs.writeFileSync(newFile, fs.readFileSync(oldFile))
        } catch (error) {
            console.log(error, `复制文件${oldFile}失败`)
        }
    }

    /**
     * @description 异步复制文件
     * @param {string} oldFile 源文件
     * @param {string} newFile 新文件
     */
    copyFile(oldFile, newFile) {
        fs.createReadStream(oldFile)
            .pipe(fs.createWriteStream(newFile))
            .on("finish", () => {
                console.log(`${oldFile}文件复制完成`)
            })
            .on("error", (error) => {
                console.log(error, "文件复制失败")
            })
    }

    /**
     * 异步复制文件夹,可以通过参数决定是否复制子文件夹，可根据名字过滤并重命名为filter
     * @param {string}oldPath 要复制的文件夹
     * @param {string}newPath 复制到的文件夹
     * @param {Boolean}OnlyFile 是否复制子文件夹
     * @param {string}filter 根据名字过滤要复制的对象
     * @param {Boolean}rename 是否重命名为filter
     */
    copyFolder(oldPath, newPath, OnlyFile = false, filter = "", rename = false) {
        fs.readdir(oldPath, (err, files) => {
            if (!err) {
                files.forEach((file) => {
                    if (file.indexOf(filter) > -1) {
                        if (!fs.statSync(`${oldPath}\\${file}`).isDirectory()) {
                            let name = file
                            if (rename) name = `${filter}${path.extname(file)}`
                            copyFile(`${oldPath}\\${file}`, `${newPath}\\${name}`)
                        } else {
                            if (!OnlyFile)
                                copyFolder(
                                    `${oldPath}\\${file}`,
                                    `${newPath}\\${file}`,
                                    OnlyFile,
                                    filter,
                                    rename,
                                )
                        }
                    }
                })
            }
        })
    }

    /**
     * 同步复制文件夹,可以通过参数决定是否复制子文件夹，可根据名字过滤并重命名为filter
     * @param {string}oldPath 要复制的文件夹
     * @param {string}newPath 复制到的文件夹
     * @param {Boolean}OnlyFile 是否复制子文件夹
     * @param {string}filter 根据名字过滤要复制的对象
     * @param {Boolean}rename 是否重命名为filter
     */
    copyFolderSync(oldPath, newPath, OnlyFile = false, filter = "", rename = false) {
        fs.readdirSync(oldPath).forEach((file) => {
            if (file.indexOf(filter) > -1) {
                if (!fs.statSync(`${oldPath}\\${file}`).isDirectory()) {
                    name = file
                    if (rename) name = `${filter}${path.extname(file)}`
                    copyFileSync(`${oldPath}\\${file}`, `${newPath}\\${name}`)
                } else {
                    if (!OnlyFile)
                        copyFolderSync(
                            `${oldPath}\\${file}`,
                            `${newPath}\\${file}`,
                            OnlyFile,
                            filter,
                            rename,
                        )
                }
            }
        })
    }

    /**
     * @description 同步解压文件夹，用adm-zip解压
     * @param {string} filePath 压缩文件
     * @param {string} extracePath 解压文件夹
     */
    ExtractZipSync(filePath, extracePath) {
        return new Promise((resolve, reject) => {
            try {
                var zip = new AdmZip(filePath)
                zip.extractAllTo(extracePath, true)
                return resolve()
            } catch (error) {
                return reject(error)
            }
        })
    }

    /**
     * @description 异步解压文件夹，用unzip解压
     * @param {string} filePath 压缩文件
     * @param {string} extracePath 解压文件夹
     */
    ExtractZip(filePath, extracePath, callback = () => {}) {
        fs.createReadStream(filePath)
            .pipe(
                unzip.Extract({
                    path: extracePath,
                }),
            )
            .on("finish", () => {
                console.log("解压完成")
                callback()
            })
            .on("error", (error) => {
                console.log(error, "解压失败")
            })
    }


    /** 
     * @description 将多个文件夹文件移动到一个文件夹
     * @param path 源文件夹
     * @param newpath 新文件夹
     */
    moveToOne(path, newpath) {
        fs.readdir(path, (err, files) => {
            if (!err) {
                files.forEach(file => {
                    let OldFile = `${path}\\${file}`
                    if (!fs.statSync(OldFile).isDirectory())
                        fs.createReadStream(OldFile)
                        .pipe(fs.createWriteStream(`${newpath}\\${file}`));
                    else {
                        move(OldFile, newpath);
                    }
                });
            }
        })
    }

    // 为文件夹下的全部文件增加前缀，复制至另一文件夹
    renameAllFileWithPrefix(fileDirectory, newfileDirectory, prefix) {
        if (fs.existsSync(fileDirectory)) {
            var files = fs.readdirSync(fileDirectory);
            for (var i = 0; i < files.length; i++) {
                var filePath = fileDirectory + "/" + files[i];
                var fileName = prefix + files[i];
                var newFilePath = newfileDirectory + "/" + fileName;
                fs.rename(filePath, newFilePath, function(err) {
                    if (err) throw err;
                });
            }
        } else {
            console.log(fileDirectory + "  Not Found!");
        }
    }

    // 为文件夹下的全部文件增加后缀，复制至另一文件夹
    renameAllFileWithSuffix(fileDirectory, newfileDirectory, suffix) {
        if (fs.existsSync(fileDirectory)) {
            var files = fs.readdirSync(fileDirectory);
            for (var i = 0; i < files.length; i++) {
                var filePath = fileDirectory + "/" + files[i];
                var fileName = files[i] + suffix;
                var newFilePath = newfileDirectory + "/" + fileName;
                fs.rename(filePath, newFilePath, function(err) {
                    if (err) throw err;
                });
            }
        } else {
            console.log(fileDirectory + "  Not Found!");
        }
    }
}

export default new File()