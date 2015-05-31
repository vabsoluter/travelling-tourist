module.exports = function(grunt){
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        less: {
            files: ['frontend/less/**/*.less'],
            development: {
                files: {
                    'frontend/public/css/index.css': 'frontend/less/index.less'
                }
            }
        },
        browserify: {
            files: ['frontend/js/**/*.js'],
            dist: {
                files: {
                    'frontend/public/js/index.js': ['frontend/js/index.js', 'frontend/js/clean-map.js']
                }
            }
        },
        watch: {
            files: ['<%= less.files %>', '<%= browserify.files %>'],
            tasks: ['less:development', 'browserify:dist']
        }
    });

    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-browserify');

    grunt.registerTask('default', ['less:development']);
};