<?php
define('APP_DIR', dirname(__FILE__));

//---------------------------------------------------

if (isset($_POST['_todo']))
{
    $api_url = 'http://pixelpt-sandwich-api.herokuapp.com';
    
    if (in_array($_POST['_todo'], array('sandwiches')))
    {
        if (($raw_data = file_get_contents("{$api_url}/{$_POST['_todo']}")) === FALSE)
            exit('ERROR#' . __LINE__);
            
        if (($parsed_data = json_decode($raw_data)) === NULL)
            exit('ERROR#' . __LINE__);
    }
    
    switch ($_POST['_todo']) 
    {
        case 'add-item':
                    
            if (!isset($_POST['title']) || strlen($_POST['title']) === 0 
                || !isset($_POST['price']) || strlen($_POST['price']) === 0)
                exit(json_encode(array('result' => 'ERROR', 'msg' => 'Debes completar los campos.')));
            
            
            $item = array(
                'sandwich' => array(
                    'title' => $_POST['title'],
                    'price' => intval($_POST['price']),
                    'ingredients_attributes' => array()
                )
            );
            
            for ($i = 1; $i <= intval($_POST['ingredients_qty']); $i++)
            {
                if (!isset($_POST["ingredient_name_{$i}"]) || strlen($_POST["ingredient_name_{$i}"]) === 0 
                    || !isset($_POST["ingredient_qty_{$i}"]) || strlen($_POST["ingredient_qty_{$i}"]) === 0)
                    continue;
                
                $item['sandwich']['ingredients_attributes'][] = array(
                    'name' => $_POST["ingredient_name_{$i}"],
                    'quantity' => intval($_POST["ingredient_qty_{$i}"])
                );
            }
            
            if (!isset($_POST['ingredients_qty']) || strlen($_POST['ingredients_qty']) === 0
                || count($item['sandwich']['ingredients_attributes']) === 0)
                exit(json_encode(array('result' => 'ERROR', 'msg' => 'Debes agregar por lo menos 1 ingrediente.')));
            
            
            $fp = fsockopen("pixelpt-sandwich-api.herokuapp.com", 80, $errno, $errstr, 30);
            
            if (!$fp)
            {
                exit('ERROR#' . __LINE__);
            } 
            else
            {
                $content = json_encode($item);
                
                $request = "POST /sandwiches HTTP/1.1\r\n";
                $request .= "Host: pixelpt-sandwich-api.herokuapp.com\r\n";
                $request .= "Content-Type: application/json\r\n";
                $request .= sprintf("Content-Length: %u\r\n", strlen($content));
                $request .= "Connection: Close\r\n\r\n";
                $request .= $content;
                
                $response = '';
                
                fwrite($fp, $request);
                while (!feof($fp))
                {
                    $response .= fgets($fp, 128);
                }
                fclose($fp);
                
                list($response_headers, $response_body) = explode("\r\n\r\n", $response, 2);
                
                if (($parsed_response_body = json_decode($response_body, TRUE)) === NULL) 
                    exit('ERROR#' . __LINE__);
                
                
                $output = array();
                
                if (isset($parsed_response_body['sandwich']))
                {
                    $output['result'] = 'OK';
                    $output['sandwich'] = $parsed_response_body['sandwich'];
                }
                else
                {
                    $output['result'] = 'ERROR';
                    $output['msg'] = '';
                    
                    $fields = array(
                        'title' => 'Título', 
                        'price' => 'Precio', 
                    );
                    
                    $output['msg'] .= '<ul>';
                    foreach ($parsed_response_body as $key => $value) 
                    {
                        if (isset($fields[$key]))
                            $label = $fields[$key];
                        else
                            $label = $key;
                            
                        $output['msg'] .= sprintf('<li><strong>%s:</strong> %s</li>', $label, implode(', ', $value));
                    }
                    $output['msg'] .= '</ul>';
                }
                
                echo json_encode($output);
            }
            
            break;

        case 'sandwiches':

            if (!isset($parsed_data->sandwiches))
                exit('ERROR#' . __LINE__);

//                $parsed_data['result'] = 'ok';
//                $raw_data = json_encode($parsed_data);

            echo $raw_data;

            break;
    }
    
    exit;
}

?><!DOCTYPE html>
<html lang="es" manifest="cache.manifest">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1">
        
        <title>pixelpt-sandwich-client</title>
        
        <link type="text/plain" rel="author" href="http://pixelpt-sandwich-client.herokuapp.com//humans.txt" />
         
        <script src="js/jquery-1.9.1.min.js" type="text/javascript"></script>
        
        <link href="js/bootstrap/css/bootstrap.min.css" rel="stylesheet" media="all" type="text/css" />
        <link href="js/bootstrap/css/bootstrap-responsive.min.css" rel="stylesheet"  media="all" type="text/css" />
        <script src="js/bootstrap/js/bootstrap.min.js" type="text/javascript"></script>
        
        <script src="js/jquery.masonry.min.js" type="text/javascript"></script>
        
        <script src="js/mustache.js" type="text/javascript"></script>
        
        <link href="css/main.css?v=<?php echo filemtime(APP_DIR . '/css/main.css'); ?>" rel="stylesheet" media="all" type="text/css" />
        <script src="js/main.js?v=<?php echo filemtime(APP_DIR . '/js/main.js'); ?>" type="text/javascript"></script>
    </head>
    <body>
        
        <div id="loading"><div><img src="images/loading.gif"><em></em></div></div>
        
        <div id="add-item-win" class="modal hide fade" tabindex="-1" role="dialog" aria-labelledby="add-item-winLabel" aria-hidden="true">
            <div class="modal-header">
                <button type="button" class="close" data-dismiss="modal" aria-hidden="true">×</button>
                <h3 id="add-item-winLabel">Agregar sandwich</h3>
            </div>
            <div class="modal-body">
                <form id="add-item-form" class="form-horizontal" action="javascript:;">
                    <input type="hidden" name="_todo" value="add-item" />
                    
                    <div id="add-item-form-msg" class="alert hide">
                        <button type="button" class="close" data-dismiss="alert">&times;</button>
                        <h4>!</h4> 
                        <span></span>
                    </div>
                    
                    <div class="control-group">
                        <label class="control-label" for="inputTitle">Título</label>
                        <div class="controls">
                            <input type="text" id="inputTitle" name="title" placeholder="" class="input-xlarge" required>
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <label class="control-label" for="inputPrice">Precio</label>
                        <div class="controls">
                            <div class="input-prepend">
                                <span class="add-on">BTC$</span>
                                <input class="span2" id="inputPrice" type="text" name="price" placeholder="" class=""  required>
                            </div>
                        </div>
                    </div>
                    
                    <div class="control-group">
                        <label class="control-label" for="">Ingredientes</label>
                        
                        <input type="hidden" name="ingredients_qty" value="" />
                        <div class="controls">
                            <a class="btn" id="add-ingredient-btn" href="#"><i class="icon-plus"></i> Agregar</a>
                        </div>
                    </div>
                    
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn" data-dismiss="modal" aria-hidden="true">Cerrar</button>
                <button class="btn btn-primary" id="add-item-form-submit">Crear</button>
            </div>
        </div>
        
        <div class="container">
            
            <div class="page-header">
                <h1>pixelpt-sandwich-client <small>v0.1</small></h1>
                <p>By <a href="http://joserobinson.com" target="_blank">JoseRobinson.com</a></p>
            </div>

            <div class="well" id="toolbar">
                <div class="pull-right">
                    <a href="#add-item-win" role="button" class="btn btn-primary" data-toggle="modal"><i class="icon-plus icon-white"></i> Agregar sandwich</a>
                </div>
            </div>
            
            <div id="items-box">
                <ul class="thumbnails"></ul>
            </div>
            
        </div>
        
        
        <script id="ingredient-box-tpl" type="text/template">
            <div class="ingredient-box">
                <input type="text" name="ingredient_name_{{num}}" class="input-medium" required> 
                <input type="number" name="ingredient_qty_{{num}}" class="input-mini" required>
                <a class="btn delete-ingredient-btn" href="#"><i class="icon-minus"></i></a>
            </div>
        </script>
        <script id="item-box-tpl" type="text/template">
            <li class="span3 item">
                <div class="thumbnail">
                    <img src="images/sandwich.gif" alt="{{title}}" />
                    <div class="caption">
                        <h4 class="title">{{title}}</h4>
                        <span class="price">Precio: BTC${{price}}</span>
                        <span class="ingredients_count">Ingredientes: {{ingredients_count}}</span>
                        <ul>
                            {{#ingredients}}<li>{{name}} <em>({{quantity}})</em></li>{{/ingredients}}
                        </ul>
                    </div>
                </div>
            </li>
        </script>
        
    </body>
</html>
