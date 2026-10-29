var PROD=["Naturaleza y ríos (Otú, balnearios)","Aventura y caminatas","Turismo minero y ruta del oro","Patrimonio e historia","Semana Santa y turismo religioso","Fiestas y cultura","Gastronomía local","Agroturismo y cacao","Comunidades indígenas","Aviturismo"];
var FORMS={
 A:{name:"Vitrina de destinos",short:"Stands de otras regiones",title:"exp",fields:[
  {id:"exp",l:"Destino o expositor",t:"text",req:1,ph:"Ej.: Jardín, Antioquia · Operador Aventura Sur"},
  {id:"region",l:"Departamento o región",t:"text"},
  {id:"tipo",l:"Tipo de expositor",t:"select",o:["Destino u oficina de turismo","Operador o agencia","Hotel o alojamiento","Aerolínea o transporte","Gremio o institución","Emprendimiento comunitario","Otro"]},
  {id:"prod",l:"Producto que promociona",t:"checks",o:PROD.concat(["Bienestar y descanso","Sol y playa","Otro"])},
  {id:"similar",l:"¿Qué tanto se parece a lo que puede ofrecer Remedios?",t:"radio",o:["Muy parecido","Algo parecido","Poco parecido"]},
  {id:"precio",l:"Precio de referencia de un plan o paquete",t:"text",ph:"Ej.: $450.000 por persona, 2 días 1 noche, con transporte"},
  {id:"presenta",l:"¿Cómo presentan su destino en el stand?",t:"checks",o:["Video o pantallas","Degustación","Artesanía o demostración en vivo","Folletos y mapas","Código QR o web","Realidad virtual","Trajes típicos o personajes","Música o baile","Concurso o rifa"]},
  {id:"idea",l:"Idea que Remedios podría copiar",t:"textarea",req:1,ph:"Qué hacen bien y cómo se aplicaría en Remedios"},
  {id:"contacto",l:"Contacto del stand (si lo dieron)",t:"text",ph:"Nombre, WhatsApp o correo"},
  {id:"cal",l:"Calificación del stand",t:"scale",cap:["Débil","Excelente"]}
 ]},
 B:{name:"Compradores y aliados",short:"Agencias, operadores, hoteles",title:"empresa",fields:[
  {id:"empresa",l:"Empresa",t:"text",req:1},
  {id:"tipo",l:"Tipo de empresa",t:"select",req:1,o:["Agencia de viajes","Operador mayorista","Operador receptivo","Hotel o cadena hotelera","Aerolínea","Transporte terrestre","Plataforma digital","Caja de compensación","Colegio o universidad (turismo educativo)","Empresa (corporativo e incentivos)","Medio o creador de contenido","Entidad pública"]},
  {id:"ciudad",l:"Ciudad",t:"text"},
  {id:"persona",l:"Nombre de quien atendió",t:"text"},
  {id:"cargo",l:"Cargo",t:"text"},
  {id:"tel",l:"Teléfono o WhatsApp",t:"tel"},
  {id:"correo",l:"Correo",t:"email"},
  {id:"seg",l:"Mercados que atiende",t:"checks",o:["Familias","Jóvenes","Adulto mayor","Grupos escolares","Empresas","Religioso","Aventura","Extranjeros"]},
  {id:"conoce",l:"¿Conoce Remedios como destino?",t:"radio",o:["Sí, ya lo vende","Sí, pero no lo vende","No lo conoce"]},
  {id:"interes",l:"Interés en vender Remedios",t:"scale",req:1,cap:["Ninguno","Muy alto"]},
  {id:"prod",l:"Productos de Remedios que le interesarían",t:"checks",o:PROD},
  {id:"necesita",l:"¿Qué necesita para venderlo?",t:"checks",o:["Tarifas netas o comisionables","Fichas de producto","Fotos y video","Prestadores con RNT","Garantías de seguridad","Transporte resuelto","Más capacidad hotelera","Guías certificados","Viaje de familiarización"]},
  {id:"grupo",l:"Tamaño típico de grupo (personas)",t:"number"},
  {id:"temporada",l:"Temporada en que más vende",t:"text",ph:"Ej.: Semana Santa, vacaciones de mitad de año"},
  {id:"paso",l:"Próximo paso acordado",t:"select",req:1,o:["Enviar portafolio","Agendar llamada o reunión","Invitar a viaje de familiarización","Enviar cotización","Ninguno por ahora"]},
  {id:"notas",l:"Notas de la conversación",t:"textarea"},
  {id:"autoriza",l:"La persona autorizó guardar sus datos de contacto para que el Plan Municipal de Turismo de Remedios la contacte (Ley 1581 de 2012).",t:"consent"}
 ]},
 C:{name:"Percepción del destino",short:"Entrevistas al público",title:"perfil",fields:[
  {id:"perfil",l:"La persona es",t:"radio",req:1,o:["Visitante o turista","Profesional del sector","Estudiante","Expositor"]},
  {id:"origen",l:"Ciudad de origen",t:"text"},
  {id:"edad",l:"Rango de edad",t:"radio",o:["18–25","26–35","36–50","51–65","Más de 65"]},
  {id:"conoce",l:"¿Ha oído hablar de Remedios, Antioquia?",t:"radio",req:1,o:["Sí, lo ha visitado","Sí, pero no lo ha visitado","No"]},
  {id:"asocia",l:"¿Qué palabra asocia con Remedios?",t:"text",ph:"Lo primero que diga"},
  {id:"prod",l:"¿Qué le atraería de Remedios?",t:"checks",o:PROD,help:"Mostrar el folleto o el afiche antes de preguntar"},
  {id:"viajaria",l:"¿Qué tan probable es que viaje a Remedios?",t:"scale",req:1,cap:["Nada","Seguro"]},
  {id:"frena",l:"¿Qué le frena?",t:"checks",o:["Seguridad u orden público","Distancia o estado de las vías","Falta de información","Pocas opciones de hospedaje","Costo","No sabe qué hacer allá","Nada"]},
  {id:"con",l:"¿Con quién viajaría?",t:"radio",o:["Solo","Pareja","Familia","Amigos","Grupo organizado"]},
  {id:"noches",l:"¿Cuánto tiempo?",t:"radio",o:["Pasadía","1 noche","2 noches","3 noches o más"]},
  {id:"gasto",l:"Gasto por persona por día",t:"radio",o:["Menos de $100.000","$100.000–200.000","$200.000–400.000","Más de $400.000"]},
  {id:"canal",l:"¿Dónde busca información para viajar?",t:"checks",o:["Instagram","TikTok","Facebook","Google o Google Maps","YouTube","Agencias","Recomendación de conocidos","Booking o Airbnb"]},
  {id:"coment",l:"Comentario",t:"textarea"}
 ]}
};

FORMS.A.fields.push({id:"autoriza",l:"La persona autorizó guardar el contacto del stand para el seguimiento del Plan Municipal de Turismo de Remedios.",t:"consent"});
export { FORMS, PROD };
