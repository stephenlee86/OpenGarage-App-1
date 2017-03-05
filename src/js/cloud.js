/* global angular, sjcl */

// OpenGarage
angular.module( "opengarage.cloud", [ "opengarage.utils" ] )
    .factory( "Cloud", [ "$injector", "$rootScope", "Utils", "Settings", function( $injector, $rootScope, Utils, Settings ) {

        var requestAuth = function() {
                $ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );

                var scope = $rootScope.$new();
                scope.data = {};

                $ionicPopup.show( {
                    templateUrl: "templates/cloudLogin.html",
                    title: "OpenGarage.io Login",
                    scope: scope,
                    buttons: [
                        { text: "Cancel" },
                        {
                            text: "<b>Login</b>",
                            type: "button-positive",
                            onTap: function( e ) {
                                if ( !scope.data.username || !scope.data.password ) {
                                    e.preventDefault();
                                    return;
                                }

                                return true;
                            }
                        }
                    ]
                } ).then( function( isValid ) {
                    if ( isValid ) {
                        login( scope.data.username, scope.data.password, syncStart );
                    }
                } );
            },
            login = function( user, pass, callback ) {
                callback = callback || function() {};
                $http = $http || $injector.get( "$http" );
                $httpParamSerializerJQLike = $httpParamSerializerJQLike || $injector.get( "$httpParamSerializerJQLike" );
                $http( {
                    method: "POST",
                    url: Settings.httpServer + "/api/user/signin",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                    },
                    data: $httpParamSerializerJQLike( {
                        email: encodeURIComponent( user ),
                        password: encodeURIComponent( pass )
                    } )
                } ).then( function( result ) {
                    if ( result.data.user !== undefined ) {
                        Utils.storage.set( {
                            "cloudToken": result.data.user.apikey,
                            "cloudDataToken": sjcl.codec.hex.fromBits( sjcl.hash.sha256.hash( pass ) )
                        } );
                        $rootScope.isSynced = true;
                    }
                    callback( result );
                }, function() {
                    callback( false );
                } );
            },
            logout = function() {
                Utils.storage.remove( "cloudToken" );
                $rootScope.isSynced = false;
            },
            syncStart = function() {

                getControllers( function( controllers ) {
                    if ( JSON.stringify( controllers ) === JSON.stringify( $rootScope.controllers ) ) {
                        return;
                    }

                    if ( Object.keys( controllers ).length > 0 ) {
                        $rootScope.controllers = controllers;
                        Utils.storage.set( { "controllers": JSON.stringify( controllers ) }, function() { } );
                        Utils.updateQuickLinks();
                    }
                } );
            },
            sync = function( callback ) {
                callback = callback || function() {};
                getControllers( function( data ) {
                    if ( data !== false ) {
                        Utils.storage.set( { "controllers": JSON.stringify( data ) }, callback );
                        $rootScope.controllers = data;
                        Utils.updateQuickLinks();
                    }
                } );
            },
            deleteController = function( device, callback ) {
                callback = callback || function() {};
                $http = $http || $injector.get( "$http" );
                var local = Utils.storage.get( [ "cloudToken" ] );
                $http( {
                    method: "DELETE",
                    url: Settings.httpServer + "/api/device/" + device.deviceid,
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                    },
                    params: {
                        "apikey": local.cloudToken
                    }
                } ).then( function( result ) {
                    callback( result.data );
                }, function() {
                    callback( false );
                } );
            },
            getControllers = function( callback ) {
                callback = callback || function() {};
                $http = $http || $injector.get( "$http" );
                $httpParamSerializerJQLike = $httpParamSerializerJQLike || $injector.get( "$httpParamSerializerJQLike" );

                Utils.storage.get( [ "cloudToken" ], function( local ) {
                    if ( local.cloudToken === undefined || local.cloudToken === null ) {
                        callback( false );
                        return;
                    }

                    $http( {
                        method: "GET",
                        url: Settings.httpServer + "/api/device",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                        },
                        params: {
                            "apikey": local.cloudToken
                        }
                    } ).then( function( result ) {
                        if ( result.data.length !== undefined ) {
                            for ( var i in result.data ) {
                                if ( !result.data[ i ].hasOwnProperty( "mac" ) ) {
                                    result.data[ i ].mac = result.data[ i ].deviceid;
                                }
                            }
                        }
                        callback( result.data );
                    }, function() {
                        callback( false );
                    } );
                } );
            },
            saveController = function( callback ) {
                if ( typeof callback !== "function" ) {
                    callback = function() {};
                }
                $http = $http || $injector.get( "$http" );
                $httpParamSerializerJQLike = $httpParamSerializerJQLike || $injector.get( "$httpParamSerializerJQLike" );

                Utils.storage.get( [ "cloudToken", "cloudDataToken" ], function( local ) {
                    if ( local.cloudToken === null || local.cloudToken === undefined ) {
                        callback( false );
                        return;
                    }
                    var data = {
                        name: "My door",
                        group: "default",
                        deviceid: "deviceid",
                        apikey: local.cloudToken,
                        type: "01",
                        ipAddr: "192."
                    };

                    $http( {
                        method: "POST",
                        url: Settings.httpServer + "/api/device",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                        },
                        data: $httpParamSerializerJQLike( data )
                    } ).then( function( result ) {
                        callback( result.data.success );
                    }, function() {
                        callback( false );
                    } );
                } );
            },
            saveControllers = function( callback ) {
                if ( typeof callback !== "function" ) {
                    callback = function() {};
                }
                $http = $http || $injector.get( "$http" );
                $httpParamSerializerJQLike = $httpParamSerializerJQLike || $injector.get( "$httpParamSerializerJQLike" );

                Utils.storage.get( [ "cloudToken", "cloudDataToken" ], function( data ) {
                    if ( data.cloudToken === null || data.cloudToken === undefined ) {
                        callback( false );
                        return;
                    }

                    $http( {
                        method: "POST",
                        url: "https://opengarage.io/wp-admin/admin-ajax.php",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
                        },
                        data: $httpParamSerializerJQLike( {
                            token: data.cloudToken,
                            controllerType: "opengarage",
                            sites: encodeURIComponent( JSON.stringify( sjcl.encrypt( data.cloudDataToken, JSON.stringify( $rootScope.controllers ) ) ) )
                        } )
                    } ).then( function( result ) {
                        if ( result.data.success === false ) {
                            if ( result.data.message === "BAD_TOKEN" ) {
                                handleExpiredLogin();
                            }
                            callback( false, result.data.message );
                        } else {
                            Utils.storage.set( { "cloudToken": result.data.token } );
                            callback( result.data.success );
                        }
                    }, function() {
                        callback( false );
                    } );
                } );
            },
            handleInvalidDataToken = function() {
                Utils.storage.remove( "cloudDataToken" );

                $ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );
                $ionicPopup.prompt( {
                    title: "Unable to read cloud data",
                    subTitle: "Enter a valid password to decrypt the data",
                    template: "Please enter your OpenSprinkler.com password. If you have recently changed your password, you may need to enter your previous password to decrypt the data.",
                    inputType: "password",
                    inputPlaceholder: "Password"
                } ).then( function( password ) {
                    Utils.storage.set( {
                        "cloudDataToken": sjcl.codec.hex.fromBits( sjcl.hash.sha256.hash( password ) )
                    } );
                    sync();
                } );
            },
            handleExpiredLogin = function() {
                Utils.storage.remove( "cloudToken" );

                $ionicPopup = $ionicPopup || $injector.get( "$ionicPopup" );
                $ionicPopup.confirm( {
                    title: "OpenGarage.io Login Expired",
                    template: "Click here to re-login to OpenGarage.io"
                } ).then( function( result ) {
                    if ( result ) {

                        requestAuth( function( result ) {
                            if ( result === true ) {
                                sync();
                            }
                        } );

                    }
                } );
            },
            getTokenUser = function( token ) {
                return atob( token ).split( "|" )[ 0 ];
            },
            isLoggedIn = function( ) {
                var local = Utils.storage.get( [ "cloudToken", "cloudDataToken" ] );

                // If cloud api key is missing
                if ( local.cloudToken === undefined || local.cloudToken === null ) {
                    return false;
                }

                // If password not available
                if ( local.cloudDataToken === undefined || local.cloudDataToken === null ) {
                    return false;
                }
                return true;
            },
            $http, $httpParamSerializerJQLike, $ionicPopup;

        Utils.storage.get( [ "cloudToken", "cloudDataToken" ], function( data ) {

            if ( data.cloudToken === null || data.cloudToken === undefined || data.cloudDataToken === undefined || data.cloudDataToken === undefined ) {
                $rootScope.isSynced = false;
            } else {
                $rootScope.isSynced = true;
            }
        } );

        return {
            requestAuth: requestAuth,
            login: login,
            logout: logout,
            syncStart: syncStart,
            sync: sync,
            deleteController: deleteController,
            getControllers: getControllers,
            saveController: saveController,
            saveControllers: saveControllers,
            handleInvalidDataToken: handleInvalidDataToken,
            handleExpiredLogin: handleExpiredLogin,
            getTokenUser: getTokenUser,
            isLoggedIn: isLoggedIn
        };
    } ] );
