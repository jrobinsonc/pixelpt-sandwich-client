var App = {

    loading: {
        $box: null,
        $text: null,

        show: function(msg){

            if (App.loading.$box === null) {
                App.loading.$box = $('#loading');
                App.loading.$text = App.loading.$box.children('div').children('em');
            }

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
    add_item: function(item) {
        App.$items_box.append(Mustache.render(App.item_tpl, item));
    },
    load_items: function() {

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

                $.each(response.sandwiches, function(key, value){
                    App.add_item(value);
                });

                App.reorder_items();
            },
            complete: function() {
                App.loading.hide();
            },
            error: function() {
                App.system_error();
            }
        });
    },

    init: function(){

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
            };
            
            $add_ingredient_btn.parent().append(Mustache.render(ingredient_box_tpl, data));
            
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
                            App.add_item(response.sandwich);
                            App.reorder_items();
                            
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