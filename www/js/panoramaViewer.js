;(function($){

	//vrbk
	jQuery.fn.panoramaViewer=function(optUser){

		//options
		const optDef={
			src			: "",
			rotationY	: 0
		};
		const opt=$.extend(optDef,optUser);

		//canvas
		const myCanvas=$(this);
		var cv=new Canvas();
		function Canvas(){
			this._id		=myCanvas.attr("id");
			this._box		=myCanvas.closest(".canvas_box");
			this._loader	=myCanvas.closest(".canvas_box").find(".canvas_loader");
			this._start		=myCanvas.closest(".canvas_box").find(".canvas_start");

			this._w			=this._box.width();
			this._h			=this._box.height();
		}
		myCanvas.attr({
			'width'  : cv._w,
			'height' : cv._h
		});

		//three.js
		var renderer;
		var scene;
		var camera;
		var controls;

		//group
		var grpWorld;
		var grpBase;

		//loader
		var loader={};

		//timer
		var timerLoading;

		//ジャイロセンサー確認
		var isGyro=false;
		if((window.DeviceOrientationEvent)&&('ontouchstart' in window)){
			isGyro=true;
		}

		//PCなど非ジャイロ
		if(!isGyro){
			setCanvas();

		//一応ジャイロ持ちデバイス
		}else{
			//ジャイロ動作確認
			var resGyro=false;
			window.addEventListener("deviceorientation",doGyro,false);
			function doGyro(){
				resGyro=true;
				window.removeEventListener("deviceorientation",doGyro,false);
			}

			//数秒後に判定
			setTimeout(function(){
				//ジャイロが動いた
				if(resGyro){
					setCanvas();

				//ジャイロ持ってるくせに動かなかった
				}else{
					//iOS13+方式ならクリックイベントを要求
					if(typeof DeviceOrientationEvent.requestPermission==="function"){
						//ユーザアクションを得るための要素を表示
						cv._start.show();
						cv._start.on("click",function(){
							cv._start.hide();
							DeviceOrientationEvent.requestPermission().then(res => {
								//「動作と方向」が許可された
								if(res==="granted"){
									setCanvas();
								//「動作と方向」が許可されなかった
								}else{
									isGyro=false;
									setCanvas();
								}
							});
						});

					//iOS13+じゃない
					}else{
						//早くアップデートしてもらうのを祈りながら諦める
						isGyro=false;
						setCanvas();
					}
				}
			},300);
		}


		///////////////////////////////////////////////////////////////////////////////////////////
		// Canvas
		///////////////////////////////////////////////////////////////////////////////////////////

		function setCanvas(){
			if(!Detector.webgl){Detector.addGetWebGLMessage();}
			cv._loader.show();

			renderer=new THREE.WebGLRenderer({
				canvas    : document.querySelector('#'+cv._id),
				antialias : true,
				alpha     : true
			});

			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(cv._w,cv._h);

			scene=new THREE.Scene();
			grpWorld=new THREE.Group();
			grpBase=new THREE.Group();

			//スマホなどジャイロセンサーが有効なときはDeviceOrientationControls
			if(isGyro){
				camera=new THREE.PerspectiveCamera(60,cv._w/cv._h,1,20000);
				camera.position.set(0,0,0.01);
				camera.lookAt(new THREE.Vector3(0,0,0));

				controls=new THREE.DeviceOrientationControls(camera);
				controls.connect();
				controls.update();

			//PCなどジャイロセンサーがない場合はOrbitControlsのみ
			}else{
				camera=new THREE.PerspectiveCamera(60,cv._w/cv._h,1,20000);
				camera.position.set(0,0,0.01);
				camera.lookAt(new THREE.Vector3(0,0,0));
				controls=new THREE.OrbitControls(camera,renderer.domElement);

				controls.autoRotate		=false;
				controls.enableRotate	=true;
				controls.rotateSpeed	=-0.05;
				controls.enableDamping	=true;
				controls.dampingFactor	=0.1;
				controls.enableZoom		=false;
				controls.enablePan		=false;
			}


			///////////////////////////////////////////////////////////////////////
			// 3Dオブジェクト配置
			///////////////////////////////////////////////////////////////////////

			//base
			var gmBase=new THREE.SphereBufferGeometry(1000,60,40);
			gmBase.scale(-1,1,1);
			var mtrBase;
			if(opt.src==""){
				mtrBase=new THREE.MeshNormalMaterial();
			}else{
				loader[opt.src]=false;
				var texture=new THREE.TextureLoader().load(opt.src,function(){
					loader[opt.src]=true;
				});

				texture.minFilter=texture.magFilter=THREE.LinearFilter;
				texture.mapping=THREE.UVMapping;

				mtrBase=new THREE.MeshBasicMaterial({
					map : texture
				});
			}
			var base=new THREE.Mesh(gmBase,mtrBase);
			base.rotation.y=(opt.rotationY*Math.PI/180);
			grpBase.add(base);

			grpWorld.add(grpBase);
			scene.add(grpWorld);

			//checkLoading
			var check_sec=500;
			var check_cnt=0;
			var check_limit=30000;

			checkLoading();
			function checkLoading(){
				var flag_loading=false;
				Object.keys(loader).forEach(function(key){
					if(!loader[key]){
						flag_loading=true;
					}
				},loader);

				//読み込み中
				if(flag_loading){
					timerLoading=setTimeout(function(){
						check_cnt+=check_sec;
						if(check_cnt<check_limit){
							checkLoading();
						}else{
							//エラー処理など
							alert("読み込みに失敗しました。");
						}
					},check_sec);

				//読み込み完了
				}else{
					clearTimeout(timerLoading);
					cv._loader.hide();

					runAnimate();
				}
			}

			//runAnimate
			function runAnimate(){
				controls.update();

				renderer.render(scene,camera);
				requestAnimationFrame(runAnimate);
			}
		}


		///////////////////////////////////////////////////////////////////////////////////////////
		// Window Resize
		///////////////////////////////////////////////////////////////////////////////////////////

		var timerResize=false;
		$(window).on("resize",function(){
			if(timerResize!==false){
				clearTimeout(timerResize);
			}
			timerResize=setTimeout(function(){
				resizeCanvas();
			},500);
		});

		function resizeCanvas(){
			cv._w=cv._box.width();
			cv._h=cv._box.height();
			myCanvas.attr({
				'width'  : cv._w,
				'height' : cv._h
			});

			renderer.setPixelRatio(window.devicePixelRatio);
			renderer.setSize(cv._w,cv._h);
			camera.aspect=cv._w/cv._h;
			camera.updateProjectionMatrix();
		}

	};

})(jQuery);