var App = {
    
    cache_expiration: 60000, // milisegundos

    loading: {
        $box: null,
        $text: null,

        show: function(msg){
            App.loading.$box.show();
            App.loading.$text.text(msg);
        },
        hide: function() {
            App.loading.$box.fadeOut();
        }
    },

    system_error: function() {
        alert('Hubo un error en el sistema.');
    },

    $items_box: null,
    item_tpl: null,
    reorder_items: function() {

        var first_item = App.$items_box.children('li').eq(0);

        App.$items_box.masonry('option', {
            columnWidth: first_item.width(),
            gutterWidth: parseInt(first_item.css('margin-left'))
        });

        App.$items_box.masonry('reload');

    },
    show_item: function(item) {
        App.$items_box.append(Mustache.render(App.item_tpl, item));
    },
    download_items: function(callback, download) {
        download = download || false;
        
        $.ajax({
            type: 'POST',
            dataType: 'json',
            data: {
                _todo: 'sandwiches'
            },
            beforeSend: function() {
                App.loading.show('Cargando sandwiches...');
            },
            success: function(response) {
                
                var finish = function(sandwiches) {
                    callback(sandwiches);
                        
                    App.loading.hide();
                };
        
                if (App.ingredients_list.length === 0) {
                    
                    App.load_ingredients(function(){
                        finish(response.sandwiches);
                    }, download);
                    
                } else {
                    finish(response.sandwiches);
                }
        
                if ('storage' in App) {
                    $.each(response.sandwiches, function(key, value){
                        App.storage.save('sandwiches', value);
                    });
                    
                    App.storage.save('settings', {title: "last_update", value: new Date().getTime()});
                }
                
            },
            complete: function() {
            },
            error: function() {
                App.system_error();
            }
        });
    },
    ingredients_list: [],
    download_ingredients: function(callback) {

        $.ajax({
            type: 'POST',
            dataType: 'json',
            data: {
                _todo: 'ingredients'
            },
            beforeSend: function() {
            },
            success: function(response) {
                
                if ('storage' in App) {
                    $.each(response.ingredients, function(key, value){
                        App.storage.save('ingredients', value);
                    });                    
                }
                
                callback();
            },
            complete: function() {
            },
            error: function() {
                App.system_error();
            }
        });
    },
    load_ingredients: function(callback, download) {
        download = download || false;
        
        var db = App.storage.db,
        total_ingredients_count = 0,
        trans = db.transaction(['ingredients'], 'readwrite'),
        os_ingredients = trans.objectStore('ingredients');
        
        if (download === true) {
            
            App.download_ingredients(function() {
                App.load_ingredients(callback);
            });
            
        } else {
            
            os_ingredients.count().onsuccess = function(e) {
                total_ingredients_count = e.target.result;

                if (total_ingredients_count === 0) {

                    App.download_ingredients(function() {
                        App.load_ingredients(callback);
                    });

                } else {

                    var total_ingredients_listed = 0;

                    os_ingredients.openCursor(IDBKeyRange.lowerBound(0)).onsuccess = function(event) {
                        var result = event.target.result;

                        if (!!result === false) {
                            return;
                        }

                        if (App.ingredients_list.indexOf(result.value.name) === -1) {
                            App.ingredients_list.push(result.value.name);
                        }

                        result.continue();

                        total_ingredients_listed++;

                        if (total_ingredients_listed === total_ingredients_count) {
                            callback();
                        }
                    };
                }
            };
        }
        
    },
    load_items: function() {

        if ('storage' in App) {
            
            App.loading.show('Cargando sandwiches...');
            
            $(window).on('indexedDB-ready', function(){
                
                var db = App.storage.db,
                    trans = db.transaction(['sandwiches', 'settings'], 'readwrite'),
                    os_settings = trans.objectStore('settings'),
                    os_sandwiches = trans.objectStore('sandwiches'),
                    os_settines_var = {};
                
                os_settings.get("last_update").onsuccess = function(event) {
                    var result = event.target.result;

                    if (!!result === false) {
                        App.download_items(function(items){
                            App.show_items(items);
                        });
                        
                        return;
                    }
                    
                    os_settines_var.last_update = result.value;
                    
                    if (os_settines_var.last_update < (new Date().getTime() - App.cache_expiration)) {
                        App.download_items(function(items){
                            App.show_items(items);
                        }, true);
                        
                        return;
                    }
                    
                    os_sandwiches.count().onsuccess = function(event) {
                        os_settines_var.total_sandwiches = event.target.result;
                        
                        if (os_settines_var.total_sandwiches === 0) {
                            App.download_items(function(items){
                                App.show_items(items);
                            });

                            return;
                        }
                        
                        var os_sandwiches = trans.objectStore('sandwiches'),
                            os_sandwiches_cr = os_sandwiches.openCursor(IDBKeyRange.lowerBound(0)),
                            total_items = [],
                            total_items_listed = 0;

                        os_sandwiches_cr.onsuccess = function(event) {
                            var result = event.target.result;

                            if (!!result === false) {
                                return;
                            }
                            
                            total_items.push(result.value);

                            result.continue();
                            
                            total_items_listed++;
                            
                            if (total_items_listed === os_settines_var.total_sandwiches) {
                                App.show_items(total_items);
                                
                                App.load_ingredients(function(){
                                    App.loading.hide();
                                });
                            }
                        };
                    };
                    
                };
                    
            });
            
            return;
        }
        
        App.download_items(function(items){
            App.show_items(items);
        });
            
    },
    
    show_items: function(items) {

        $.each(items, function(key, value){
            App.show_item(value);
        });

        // organize items:
        var $images = $('#items-box .thumbnails img'),
            images_total = $images.length,
            images_count = 0;

        $images.on('load', function(){
            if (++images_count === images_total) App.reorder_items();
        });
    },

    init: function(){

        if ('indexedDB' in window) {
            App.storage = {
                db: null,
                        
                records: {},
                
                init: function() {
            
                    var request = indexedDB.open('pixelpt', 3);
                    
                    request.onupgradeneeded = function(event) {
                        var db = event.target.result;

                        // sandwiches
                        if (db.objectStoreNames.contains('sandwiches')) {
                            db.deleteObjectStore('sandwiches');
                        }
                        
                        db.createObjectStore('sandwiches', {keyPath: 'id'});
                        
                        // ingredients
                        if (db.objectStoreNames.contains('ingredients')) {
                            db.deleteObjectStore('ingredients');
                        }
                        
                        db.createObjectStore('ingredients', {keyPath: 'id'});
                        
                        // settings
                        if (db.objectStoreNames.contains('settings')) {
                            db.deleteObjectStore('settings');
                        }

                        db.createObjectStore('settings', {keyPath: 'title'});
                    };
                    
                    request.onsuccess = function(e) {
                        App.storage.db = e.target.result;
                        
                        
                        for (os_name in App.storage.records) {
                            for (row in App.storage.records[os_name]) {
                                App.storage.save(os_name, App.storage.records[os_name][row]);
                            }
                        }
                        
                        
                        $(window).trigger('indexedDB-ready')
                        .data('indexedDB-ready', true);
                    };
                },
                        
                save: function(os_name, value) {
            
                    var db = App.storage.db;
                    
                    if (db === null) {
                        
                        if (os_name in App.storage.records === false) {
                            App.storage.records[os_name] = [];
                        }
                        
                        App.storage.records[os_name].push(value);
                        
                    } else {
                        
                        var trans = db.transaction([os_name], 'readwrite'),
                            object_store = trans.objectStore(os_name);

                        object_store.put(value);
                    }
                }
            };
            
            App.storage.init();
        }
        
        
        App.loading.$box = $('#loading');
        App.loading.$text = App.loading.$box.children('div').children('em');
        

        App.$items_box = $('#items-box ul');
        App.item_tpl = $('#item-box-tpl').html();


        App.$items_box.masonry({
            itemSelector: '.item'
        });

        $(window).on('resize', function(){
            App.reorder_items();
        });


        var ingredient_box_tpl = $('#ingredient-box-tpl').html(),
            $add_ingredient_btn = $('#add-ingredient-btn'),
            $add_item_form = $('#add-item-form'),
            $add_item_form_msg = $('#add-item-form-msg'),
            $ingredients_qty_input = $add_item_form.find('input[name=ingredients_qty]'),
            $add_item_win = $('#add-item-win');
        
        $add_ingredient_btn.on('click', function(){
            
            var data = {
                num: $add_ingredient_btn.siblings('div').length + 1
            },
            $new_row = $.parseHTML(Mustache.render(ingredient_box_tpl, data)),
            $ingredient_name_input = $($new_row[1]).children('.ingredient-name');
            
            $ingredient_name_input.typeahead({
                items: 2,
                source: App.ingredients_list
            });
            
            $add_ingredient_btn.parent().append($new_row);
            
            $ingredients_qty_input.val(data.num);
        });

        $(document).on('click', '.delete-ingredient-btn', function(){
            var $btn = $(this);
            
            var $btn_box = $btn.parent();
           
            $btn_box.slideUp(function(){
                $btn_box.remove();
                
                $ingredients_qty_input.val(parseInt($ingredients_qty_input.val()) - 1);
            });
        });

        
        $add_item_form.on('disable-form', function(){
            $add_item_form.addClass('disabled');
            
            $add_item_win.find(':input').prop('disabled', true);
            $add_item_win.find('button').addClass('disabled');
        }).on('enable-form', function(){
            $add_item_form.removeClass('disabled');
            
            $add_item_win.find(':input').prop('disabled', false);
            $add_item_win.find('button').removeClass('disabled');
        }).on('clear-inputs', function(){
            $add_item_win.find(':text').val('');
        }).on('submit', function(){
            
            if ($add_item_form.is('.disabled')) {
                return;
            }
            
            $add_item_form_msg.removeClass('alert-error')
            .hide();
            
            $.ajax({
                type: 'POST',
                dataType: 'json',
                data: $add_item_form.serialize(true),
                beforeSend: function() {
                    $add_item_form_msg.removeClass('alert-error')
                    .hide();
            
                    $add_item_form.trigger('disable-form');
                },
                success: function(response) {
            
                    switch (response.result) {
                        case 'OK':
                            App.show_item(response.sandwich);
                            App.reorder_items();
                            
                            if ('storage' in App) {
                                App.storage.save('sandwiches', response.sandwich);
                            }
                            
                            $add_item_form.trigger('show-msg', ['success', 'Listo!', 'El sandwich fue creado.']);
                            $add_item_form.trigger('clear-inputs');
                            
                            setTimeout(function(){
                                $add_item_win.modal('hide');
                            }, 3000);
                            
                            break;
                            
                        case 'ERROR':
                            $add_item_form.trigger('show-msg', ['error', 'Error', response.msg]);
                            break;
                    }
            
                },
                complete: function() {
                    $add_item_form.trigger('enable-form');
                },
                error: function() {
                    App.system_error();
                }
            });
        }).on('show-msg', function(evt, type, title, msg){
            $add_item_form_msg
            .addClass('alert-' + type).slideDown()
            .find('h4').text(title)
            .next('span').html(msg);
        });

        $('#add-item-form-submit').on('click', function(){
            $add_item_form.trigger('submit');
        });
        

        App.load_items();
    }
};
    
jQuery(function($){
    App.init();
});