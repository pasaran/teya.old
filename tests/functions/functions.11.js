module.exports = {
    sum: function() {
        var sum = arguments[ 0 ];

        for ( var i = 1, l = arguments.length; i < l; i++ ) {
            sum += arguments[ i ];
        }

        return sum;
    }
};

