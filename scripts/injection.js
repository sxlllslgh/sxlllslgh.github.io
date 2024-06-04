hexo.extend.filter.register('theme_inject', function(injects) {
    injects.header.file('default', 'source/_inject/header.ejs');
});