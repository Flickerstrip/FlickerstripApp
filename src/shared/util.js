({ define: typeof define === "function"
    ? define
    : function(A,F) { module.exports = F.apply(null, A.map(require)) } }).
define([ "underscore" ],
    function (_) {
        return {
            symanticToNumeric:function(symantic) {
                if (symantic[0] == "v") symantic = symantic.substring(1);
                var parts = symantic.split(".");
                var step = 1000;
                var numeric = parseInt(parts[0])*step*step + parseInt(parts[1])*step + parseInt(parts[2]);
                //console.log("sym",symantic,numeric);
                return numeric;
            }
        }
    }
);
