/**
* @name Mixi.Common.Namespace
* @namespace いわゆる名前空間の機能を JavaScript 上に提供します。
*/

(function(ownNamespace) {
    var cache = {};
    var MESSAGE = {
        NOREF: ':: namespace error ::not found\t',
        EXIST: ':: namespace error ::overriding\t'
    };
    ownNamespace = export_createNamespace(ownNamespace);

    _.extend(ownNamespace, {
        'createNamespace': export_createNamespace,
        'isLoaded': export_isLoaded,
        'depends': export_depends,
        'using': export_using,
        'wait': export_wait,
        'dumpCache': export_dumpCache,
        'package': export_package,
        'INCLUDE': '/static/js/'
    });

    function _truncateFQN(fqn, n) {
        var leaves = fqn.split(".");
        var ret = [];
        for (var i = 0; i < n + 1; i++) {
            ret.push(leaves[i]);
        }
        return ret.join('.');
    }
    function _getNamespace(fqn) {
        if (cache[fqn]) return cache[fqn];
        try {
            var ns = eval('(' + fqn + ')');
            if (_canBeNamespace(ns)) {
                return ns;
            }
            throw ('');
        } catch (e) {
            throw (new Error(MESSAGE.NOREF));
        }
    }
    function _argumentNames(func) {
        var names = func.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
        .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
        .replace(/\s+/g, '').split(',');
        return names.length == 1 && !names[0] ? [] : names;
    }

    /**
    * 条件が真になるのを待ち func を実行します。
    * 外部ライブラリのロード後に処理を実行する、といった際に利用できます。
    *
    * @name wait
    * @param {Function|String} condition 関数が指定された場合はそれが真を返すこと、文字列が指定された場合は、それが指す名前空間の提供を待ちます
    * @param {Function} func
    * @methodOf Mixi.Common.Namespace
    */
    function export_wait(condition, func) {
        var cond = null;
        if (_.isFunction(condition)) {
            cond = condition;
        }
        if (_.isString(condition)) {
            cond = function() {
                try {
                    return _getNamespace(condition);
                } catch (e) {
                    return false;
                }
            };
        }
        var check = function(sync) {
            var obj = null;
            if (obj = cond()) {

                if (!sync) {
                    func.apply(obj);
                    clearInterval(id);
                } else {
                    return true;
                }
            }
        };
        if (check(true)) return true;
        var id = setInterval(check, 30);
    }

    /**
    * 内部のキャッシュの内容を console に表示します。
    * @name dumpCache
    * @methodOf Mixi.Common.Namespace
    */
    function export_dumpCache() {
        if (typeof console == 'undefined') { return; }
        console.dir ? console.dir(cache) : console.log(cache);

    }
    function _canBeNamespace(obj) {
        return (
            _.isUndefined(obj) || // undefined である
            typeof obj == 'object' || // 普通のhashオブジェクトである
            (_.isFunction(obj) && obj.prototype.initialize) // initialize メソッドを持つクラスである
            ) ? true : false;
    }

    /**
    * 名前空間を作成します。
    * すでに名前空間が存在する場合、例外をなげます。
    * @name createNamespace
    * @param {String} fqn 名前空間をあらわず文字列
    * @param {Function} [func] 作成後に、名前空間を this および引数として実行される関数
    * @return func が指定された場合その戻り値、それ以外では名前空間そのもの
    * @methodOf Mixi.Common.Namespace
    */
    function export_createNamespace(fqn, func) {
        if (cache[fqn]) throw (new Error(MESSAGE.EXIST + fqn));
        var leaves = fqn.split(".");
        var tmpTop = window;
        var length = leaves.length;
        var ns = _(leaves).chain()
        .map(function(e, i) {
            if (_canBeNamespace(tmpTop[e])) {
                // namespaceになれる
                var tmpFQN = _truncateFQN(fqn, i);
                if ((i == length - 1) && !_.isUndefined(tmpTop[e])) {
                    throw (new Error(MESSAGE.EXIST + tmpFQN));
                } else {
                    tmpTop[e] = tmpTop[e] || { __SELF_NAMESPACE: tmpFQN };
                }
                cache[tmpFQN] = tmpTop[e];
                tmpTop = tmpTop[e];

            } else {
                // namespaceになれない
                throw (new Error(MESSAGE.EXIST + e));
            }
            return tmpTop;
        }).last()
        .value();

        if (func) {
            return func.call(ns,ns);
        } else {
            return ns;
        }
    }

    /**
    * fqn に対応する名前空間を this および引数として func を実行します。
    * 名前空間が存在しない場合は実行前に作成されます。
    * @name package
    * @param {String} fqn 名前空間をあらわず文字列
    * @param {Function} func
    * @methodOf Mixi.Common.Namespace
    */
    function export_package(fqn, func) {
        if (cache[fqn]) {
            return func.call(cache[fqn], cache[fqn]);
        }
        else {
            return export_createNamespace(fqn, func);
        }
    }
    function _getExportedObject(list, ns) {
        var obj = {};
        var flag = false;
        _(list).each(function(arg) {
            flag = true;
            if (ns[arg]) {
                obj[arg] = ns[arg];
            } else {
                throw (new Error('cant export'));
            }
        });
        return (flag) ? obj : ns;
    }
    function _applyNamespace(fqn,funcOrExport) {
        var ns = _getNamespace(fqn);
        if (funcOrExport) {
            if (_.isFunction(funcOrExport)) {
                var func = funcOrExport;
                var obj = _getExportedObject(_argumentNames(func), ns);
                return func.apply(obj, _(_argumentNames(func)).map(function(arg) { return obj[arg]; }));
            }
            if (_.isArray(funcOrExport)) {
                return _getExportedObject(funcOrExport, ns);
            }

        } else {
            return ns;
        }
    }

    /**
    * 名前空間を作成し func を実行します。
    * 名前空間が存在しない場合の動作は createNamespace と等価です。
    * 名前空間が存在する場合 func の引数は、名前空間から export されるオブジェクトのうち、仮引数の名前と一致するものが、ここの仮引数として渡されます。
    * @name using
    * @param {String} fqn 名前空間をあらわす文字列
    * @param {Function} [func]
    * @methodOf Mixi.Common.Namespace
    */
    function export_using(fqn,func){
        try{
            return export_createNamespace(fqn,func);
        }catch(e){
            if(e.message.match(new RegExp(MESSAGE.EXIST))){
                return _applyNamespace(fqn,func);
            }
        }
    }

    /**
    * 名前空間が提供されているか否かを返します。
    * 引数は実際には可変長で、複数の名前空間を一度に指定できます。
    * @name isLoaded
    * @param {String} fqn 名前空間をあらわず文字列
    * @param {Function} func
    * @methodOf Mixi.Common.Namespace
    */
    function export_isLoaded() {
        try {
            return export_depends.apply(this, arguments);
        } catch (e) {
            return false;
        }
    }

    /**
    * 依存する他の名前空間を指定します。
    * 引数は実際には可変長で、複数の名前空間を一度に指定できます。
    * @name depends
    * @param {String} fqn 名前空間をあらわず文字列
    * @methodOf Mixi.Common.Namespace
    */
    function export_depends() {
        var fqn = _(arguments).flatten();
        var ret = [];
        try {
            for (var i = 0, l = fqn.length; i < l; i++) {
                if (_getNamespace(fqn[i])) {
                    ret.push(_getNamespace(fqn[i]));
                }
            }
        }
        catch (e) {
            throw new Error(MESSAGE.REQUIRE + fqn.join(",") + "/" + e.message);
        }
        if (ret.length == 1) {
            return ret[0];
        } else {
            return ret;
        }
    }

    // Util.Namespace の互換確保
    export_createNamespace('Mixi.Util.Namespace');
    Mixi.Util.Namespace.createNamespace = export_using;

})('Mixi.Common.Namespace');

