// script.js
// Lógica de la consola de gestión. Gestiona la carga de módulos,
// construcción dinámica de menús, creación de grupos personalizados,
// edición y eliminación de grupos mediante menú contextual, y
// filtrado de vista para mostrar todos los elementos (incluidos los
// grupos) o únicamente los grupos creados por el usuario.

(function () {
  "use strict";

  /**
   * Estructura de datos base: cada módulo contiene un objeto cuyas
   * propiedades representan menús. Cada propiedad apunta a otro
   * objeto (submenús) o a null si es un elemento final. Se han
   * incorporado niveles adicionales de submenús para dar mayor
   * profundidad a la navegación.
   */
  const modulesData = {
    Compras: {
      "Órdenes": {
        "Pendientes": {
          "Con Factura": null,
          "Sin Factura": null,
        },
        "Confirmadas": {
          "Pagadas": null,
          "Sin Pagar": null,
        },
        "Canceladas": null,
      },
      "Proveedores": {
        "Listado": {
          "Nacionales": null,
          "Internacionales": null,
        },
        "Reporte": null,
      },
      "Analítica": {
        "Estadísticas": null,
        "Historial": null,
      },
    },
    Ventas: {
      Comprobantes: {
        "Comprobantes Detallados": {
          "Mensuales": null,
          "Anuales": null,
        },
        "Comprobantes Resumidos": {
          "Mensuales": null,
          "Anuales": null,
        },
      },
      Informes: {
        "Ventas por Cliente": {
          "Frecuentes": null,
          "Nuevos": null,
        },
        "Ventas por Producto": {
          "Más Vendidos": null,
          "Menos Vendidos": null,
        },
        "Resumen Semanal": null,
      },
      "Campañas": {
        "Promociones": null,
        "Descuentos": null,
      },
    },
    Stock: {
      Inventario: {
        "Productos en Stock": {
          "Perecederos": null,
          "No Perecederos": null,
        },
        "Productos Agotados": null,
      },
      Movimientos: {
        Entradas: {
          Compras: null,
          Producción: null,
        },
        Salidas: {
          Ventas: null,
          Merma: null,
        },
      },
      Ajustes: {
        Recuentos: null,
        Revaluaciones: null,
      },
    },
  };

  /**
   * Mapeo de módulos a iconos de Font Awesome. Estos iconos se
   * utilizarán en la barra lateral para un aspecto más moderno e
   * intuitivo. Si un módulo no tiene icono asignado se utiliza un
   * ícono de carpeta por defecto.
   */
  const moduleIcons = {
    Compras: "fa-shopping-cart",
    Ventas: "fa-dollar-sign",
    Stock: "fa-boxes-stacked",
    Global: "fa-globe",
    "Mis Grupos": "fa-layer-group",
  };

  // Lista dinámica de grupos personalizados. Cada grupo posee un nombre
  // y una lista de elementos finales (opciones) con su módulo y ruta.
  let misGrupos = [];

  // Estados de filtro por módulo. Por defecto cada módulo muestra todo.
  const filterState = {
    Compras: "all",
    Ventas: "all",
    Stock: "all",
    Global: "all",
    "Mis Grupos": "all",
  };

  // Módulo actualmente seleccionado.
  let currentModule = "";

  // Índice del grupo que está siendo editado. Si es null se crea un
  // grupo nuevo.
  let editingGroupIndex = null;

  // Índice del grupo sobre el que se abrió el menú contextual.
  let contextTargetIndex = null;

  /**
   * Guarda los grupos en localStorage para que persistan entre
   * recargas de página.
   */
  function saveGroups() {
    try {
      localStorage.setItem("misGrupos", JSON.stringify(misGrupos));
    } catch (e) {
      console.warn("No se pudo guardar en localStorage", e);
    }
  }

  /**
   * Carga los grupos almacenados en localStorage. Si no existen,
   * misGrupos permanece vacío.
   */
  function loadGroups() {
    try {
      const stored = localStorage.getItem("misGrupos");
      if (stored) {
        misGrupos = JSON.parse(stored);
      }
    } catch (e) {
      console.warn("No se pudieron cargar grupos de localStorage", e);
    }
  }

  /**
   * Construye la lista de módulos en la barra lateral. Asigna
   * manejadores de evento para cambiar de módulo al hacer clic.
   */
  function buildModuleList() {
    const moduleList = document.getElementById("module-list");
    moduleList.innerHTML = "";
    const modules = Object.keys(modulesData);
    // Añadimos los módulos normales más Global y Mis Grupos
    const allModules = [...modules, "Global", "Mis Grupos"];
    allModules.forEach((mod) => {
      const li = document.createElement("li");
      // Añadir icono basado en el mapeo
      const iconName = moduleIcons[mod] || "fa-folder";
      const iconEl = document.createElement("i");
      iconEl.className = `fas ${iconName}`;
      li.appendChild(iconEl);
      // Texto del módulo
      const spanText = document.createElement("span");
      spanText.textContent = mod;
      li.appendChild(spanText);
      li.dataset.module = mod;
      li.addEventListener("click", () => {
        loadModule(mod);
      });
      moduleList.appendChild(li);
    });
  }

  /**
   * Marca como activo el elemento de la barra lateral que corresponde
   * al módulo seleccionado.
   */
  function updateActiveModule() {
    const items = document.querySelectorAll(".sidebar li");
    items.forEach((li) => {
      if (li.dataset.module === currentModule) {
        li.classList.add("active");
      } else {
        li.classList.remove("active");
      }
    });
  }

  /**
   * Construye el encabezado del módulo, con el título, los botones de
   * filtro y el botón para crear un nuevo grupo. Actualiza el estado
   * visual del filtro según lo seleccionado.
   */
  function buildModuleHeader() {
    const header = document.getElementById("module-header");
    header.innerHTML = "";
    const titleEl = document.createElement("h2");
    titleEl.textContent = currentModule;
    header.appendChild(titleEl);

    // Agrupación de botones de filtro
    const btnGroup = document.createElement("div");
    btnGroup.className = "btn-group";

    // Sólo mostramos el filtro si no es el módulo Mis Grupos
    if (currentModule !== "Mis Grupos") {
      const btnAll = document.createElement("button");
      btnAll.className = "btn";
      btnAll.innerHTML = `<i class="fas fa-list-ul"></i><span>Mostrar todo</span>`;
      btnAll.addEventListener("click", () => {
        filterState[currentModule] = "all";
        buildModuleHeader();
        renderModule();
      });
      const btnGroups = document.createElement("button");
      btnGroups.className = "btn";
      btnGroups.innerHTML = `<i class="fas fa-layer-group"></i><span>Mostrar grupos</span>`;
      btnGroups.addEventListener("click", () => {
        filterState[currentModule] = "groups";
        buildModuleHeader();
        renderModule();
      });
      // Resalta el botón según el filtro actual
      if (filterState[currentModule] === "all") {
        btnAll.style.backgroundColor = "#2f3e57";
        btnAll.style.color = "#ffffff";
        btnAll.querySelector('i').style.color = '#ffffff';
      } else {
        btnGroups.style.backgroundColor = "#2f3e57";
        btnGroups.style.color = "#ffffff";
        btnGroups.querySelector('i').style.color = '#ffffff';
      }
      btnGroup.appendChild(btnAll);
      btnGroup.appendChild(btnGroups);
    }

    // Botón para crear grupo
    const btnCreate = document.createElement("button");
    btnCreate.className = "btn";
    btnCreate.innerHTML = `<i class="fas fa-plus"></i><span>Crear grupo</span>`;
    btnCreate.addEventListener("click", () => {
      openGroupModal();
    });
    btnGroup.appendChild(btnCreate);

    header.appendChild(btnGroup);
  }

  /**
   * Carga un módulo específico y actualiza la vista de menús según el
   * filtro seleccionado.
   * @param {string} moduleName
   */
  function loadModule(moduleName) {
    currentModule = moduleName;
    updateActiveModule();
    buildModuleHeader();
    renderModule();
  }

  /**
   * Genera los menús para el módulo actual teniendo en cuenta el
   * filtro. Si el filtro es "groups" o si el módulo es "Mis Grupos",
   * se muestran únicamente los grupos creados por el usuario. En caso
   * contrario se construye el árbol de menús a partir de la
   * estructura de datos del módulo correspondiente y se añade la lista
   * de grupos al final.
   */
  function renderModule() {
    const container = document.getElementById("menu-container");
    container.innerHTML = "";
    // Determina si hay que mostrar solo grupos
    const onlyGroups =
      currentModule === "Mis Grupos" || filterState[currentModule] === "groups";

    if (onlyGroups) {
      // Mostrar grupos del usuario
      renderGroups(container);
    } else {
      // Mostrar menú del módulo
      let data;
      if (currentModule === "Global") {
        data = buildGlobalData();
      } else {
        data = modulesData[currentModule];
      }
      if (data) {
        const ul = document.createElement("ul");
        ul.className = "menu-list";
        buildMenuTree(data, ul);
        container.appendChild(ul);
      }
      // Si existen grupos, añadirlos después de la estructura de menús
      renderGroups(container, true);
    }
  }

  /**
   * Construye un objeto que contiene todos los menús de los módulos
   * "Compras", "Ventas" y "Stock". El resultado agrupa los módulos
   * como primeras claves.
   */
  function buildGlobalData() {
    const global = {};
    Object.keys(modulesData).forEach((mod) => {
      global[mod] = modulesData[mod];
    });
    return global;
  }

  /**
   * Construye la estructura de menús y submenús de forma recursiva.
   * @param {Object} data Estructura de menús/submenús
   * @param {HTMLElement} parentEl Elemento UL donde se insertarán los items
   */
  function buildMenuTree(data, parentEl) {
    Object.keys(data).forEach((key) => {
      const value = data[key];
      const li = document.createElement("li");
      li.className = "menu-item";
      // Crear contenedor de línea con posible icono de expansión
      const labelSpan = document.createElement("span");
      labelSpan.className = "label";
      labelSpan.textContent = key;

      if (value && typeof value === "object") {
        // Tiene submenús
        const toggleSpan = document.createElement("span");
        toggleSpan.className = "toggle-icon";
        toggleSpan.textContent = "+";
        li.appendChild(toggleSpan);
        li.appendChild(labelSpan);
        const subUl = document.createElement("ul");
        subUl.className = "submenu";
        buildMenuTree(value, subUl);
        li.appendChild(subUl);
        li.addEventListener("click", function (e) {
          // Evita que el clic en subelementos propague y cambie todos
          if (e.target === toggleSpan || e.target === labelSpan) {
            e.stopPropagation();
            const expanded = li.classList.toggle("expanded");
            toggleSpan.textContent = expanded ? "-" : "+";
          }
        });
      } else {
        // Elemento final
        li.classList.add("final-item");
        li.textContent = key;
        li.addEventListener("click", function (e) {
          e.stopPropagation();
          // En esta implementación las opciones finales simplemente se
          // resaltan al pasar el cursor; podría añadirse lógica extra.
          console.log("Seleccionado:", getFullPath(li));
        });
      }
      parentEl.appendChild(li);
    });
  }

  /**
   * Obtiene la ruta completa de un elemento final para mostrar en
   * consola o para otras funciones. Recorre hacia arriba en el DOM
   * buscando los textos de los menús padres.
   * @param {HTMLElement} el
   * @returns {string}
   */
  function getFullPath(el) {
    const labels = [];
    let node = el;
    while (node && node.classList) {
      if (node.classList.contains("menu-item")) {
          const label = node.querySelector(".label");
          if (label) labels.unshift(label.textContent);
      }
      if (node.classList.contains("final-item")) {
          labels.unshift(node.textContent);
      }
      node = node.parentElement;
    }
    return labels.join(" > ");
  }

  /**
   * Renderiza los grupos personalizados en el contenedor indicado. Los
   * grupos y sus elementos se ordenan alfabéticamente por nombre.
   * @param {HTMLElement} container
   * @param {boolean} hideEmptyMessage Si es true, no se muestra el
   * mensaje de “No hay grupos creados” cuando la lista está vacía.
   */
  function renderGroups(container, hideEmptyMessage = false) {
    if (misGrupos.length === 0) {
      if (!hideEmptyMessage) {
        const p = document.createElement("p");
        p.textContent = "No hay grupos creados.";
        container.appendChild(p);
      }
      return;
    }
    // Ordenar los grupos alfabéticamente pero manteniendo su índice original
    const groupsSorted = misGrupos
      .map((g, idx) => ({ group: g, originalIndex: idx }))
      .sort((a, b) =>
        a.group.name.localeCompare(b.group.name, "es", { sensitivity: "base" })
      );
    const ul = document.createElement("ul");
    ul.className = "menu-list";
    groupsSorted.forEach(({ group, originalIndex }) => {
      const liGroup = document.createElement("li");
      liGroup.className = "menu-item";
      // Guardamos el índice original para identificar el grupo en misGrupos
      liGroup.dataset.groupIndex = originalIndex;
      const toggle = document.createElement("span");
      toggle.className = "toggle-icon";
      toggle.textContent = "+";
      const label = document.createElement("span");
      label.className = "label";
      label.textContent = group.name;
      liGroup.appendChild(toggle);
      liGroup.appendChild(label);
      const subUl = document.createElement("ul");
      subUl.className = "submenu";
      // Ordenar elementos del grupo alfabéticamente
      const itemsSorted = [...group.items].sort((a, b) =>
        a.label.localeCompare(b.label, "es", { sensitivity: "base" })
      );
      itemsSorted.forEach((item) => {
        const liItem = document.createElement("li");
        liItem.className = "final-item";
        liItem.textContent = `${item.label} (${item.module})`;
        subUl.appendChild(liItem);
      });
      liGroup.appendChild(subUl);
      liGroup.addEventListener("click", function (e) {
        if (e.target === toggle || e.target === label) {
          e.stopPropagation();
          const expanded = liGroup.classList.toggle("expanded");
          toggle.textContent = expanded ? "-" : "+";
        }
      });
      // Menú contextual solo para grupos creados por el usuario
      liGroup.addEventListener("contextmenu", function (e) {
        e.preventDefault();
        e.stopPropagation();
        showContextMenu(e.pageX, e.pageY, parseInt(liGroup.dataset.groupIndex, 10));
      });
      ul.appendChild(liGroup);
    });
    container.appendChild(ul);
  }

  /**
   * Muestra el menú contextual para editar o eliminar un grupo.
   * @param {number} x Posición horizontal en la página
   * @param {number} y Posición vertical en la página
   * @param {number} index Índice del grupo dentro de misGrupos
   */
  function showContextMenu(x, y, index) {
    const menu = document.getElementById("group-context-menu");
    contextTargetIndex = index;
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    menu.hidden = false;
  }

  /**
   * Oculta el menú contextual.
   */
  function hideContextMenu() {
    const menu = document.getElementById("group-context-menu");
    menu.hidden = true;
    contextTargetIndex = null;
  }

  /**
   * Elimina un grupo por índice.
   * @param {number} index
   */
  function deleteGroup(index) {
    if (index != null && index >= 0 && index < misGrupos.length) {
      misGrupos.splice(index, 1);
      saveGroups();
      renderModule();
    }
  }

  /**
   * Abre la ventana modal para crear o editar un grupo. Genera la lista
   * de opciones finales disponibles para seleccionar mediante
   * checkboxes. Si se proporciona editingIndex, precarga el nombre y
   * selecciona los elementos del grupo.
   * @param {number|null} editingIndex
   */
  function openGroupModal(editingIndex = null) {
    const modal = document.getElementById("group-modal");
    const form = document.getElementById("group-form");
    form.innerHTML = "";
    // Configurar modo edición
    editingGroupIndex = editingIndex;
    let editingGroup = null;
    if (editingIndex !== null && editingIndex >= 0 && editingIndex < misGrupos.length) {
      editingGroup = misGrupos[editingIndex];
      document.getElementById("group-name").value = editingGroup.name;
    } else {
      document.getElementById("group-name").value = "";
    }
    // Generar campos de selección por módulo
    const finalItems = getAllFinalItems();
    // Agrupar por módulo
    const groupedByModule = {};
    finalItems.forEach((item) => {
      if (!groupedByModule[item.module]) {
        groupedByModule[item.module] = [];
      }
      groupedByModule[item.module].push(item);
    });
    Object.keys(groupedByModule).forEach((mod) => {
      const fieldset = document.createElement("fieldset");
      const legend = document.createElement("legend");
      legend.textContent = mod;
      fieldset.appendChild(legend);
      groupedByModule[mod].forEach((item) => {
        const label = document.createElement("label");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = item.path.join("|");
        checkbox.dataset.module = item.module;
        checkbox.dataset.label = item.label;
        // Si estamos editando, marcar los que pertenecen al grupo
        if (editingGroup) {
          const exists = editingGroup.items.some(
            (gi) => gi.module === item.module && gi.label === item.label && gi.path.join("|") === item.path.join("|")
          );
          if (exists) {
            checkbox.checked = true;
          }
        }
        label.appendChild(checkbox);
        label.appendChild(
          document.createTextNode(
            item.path.slice(0, -1).concat(item.label).join(" > ")
          )
        );
        fieldset.appendChild(label);
      });
      form.appendChild(fieldset);
    });
    // Preparar el buscador dentro del modal para filtrar opciones
    const searchInput = document.getElementById("group-search");
    if (searchInput) {
      // Reinicia el valor al abrir el modal
      searchInput.value = "";
      searchInput.oninput = function (e) {
        const term = e.target.value.trim().toLowerCase();
        filterGroupOptions(term);
      };
    }
    modal.hidden = false;
  }

  /**
   * Cierra la ventana modal de creación/edición de grupos.
   */
  function closeGroupModal() {
    const modal = document.getElementById("group-modal");
    modal.hidden = true;
    // limpiar índice de edición
    editingGroupIndex = null;
  }

  /**
   * Filtra las opciones dentro del formulario de grupos según el
   * término proporcionado. Oculta las etiquetas que no coinciden y
   * los fieldsets vacíos para una interfaz más ordenada.
   * @param {string} term
   */
  function filterGroupOptions(term) {
    const form = document.getElementById("group-form");
    if (!form) return;
    const fieldsets = Array.from(form.querySelectorAll("fieldset"));
    fieldsets.forEach((fs) => {
      let anyVisible = false;
      const labels = fs.querySelectorAll("label");
      labels.forEach((label) => {
        const text = label.textContent.toLowerCase();
        if (!term || text.includes(term)) {
          label.style.display = "";
          anyVisible = true;
        } else {
          label.style.display = "none";
        }
      });
      fs.style.display = anyVisible ? "" : "none";
    });
  }

  /**
   * Recorre toda la estructura de módulos para obtener una lista con
   * todas las opciones finales. Cada elemento incluye el nombre del
   * módulo, la ruta del menú y el nombre de la opción final.
   * @returns {Array<{module: string, path: string[], label: string}>}
   */
  function getAllFinalItems() {
    const items = [];
    function traverse(obj, moduleName, path) {
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        const newPath = path.concat(key);
        if (value && typeof value === "object") {
          traverse(value, moduleName, newPath);
        } else {
          items.push({ module: moduleName, path: newPath, label: key });
        }
      });
    }
    Object.keys(modulesData).forEach((mod) => {
      traverse(modulesData[mod], mod, []);
    });
    return items;
  }

  /**
   * Maneja el evento de guardar un nuevo grupo o actualizar uno
   * existente desde el modal. Valida el nombre y las opciones
   * seleccionadas.
   */
  function handleSaveGroup() {
    const nameInput = document.getElementById("group-name");
    const groupName = nameInput.value.trim();
    if (!groupName) {
      alert("Debe introducir un nombre para el grupo.");
      return;
    }
    const checkboxes = Array.from(
      document.querySelectorAll("#group-form input[type='checkbox']")
    );
    const selected = checkboxes.filter((cb) => cb.checked);
    if (selected.length === 0) {
      alert("Seleccione al menos una opción final para el grupo.");
      return;
    }
    // Construir la lista de elementos seleccionados
    const items = selected.map((cb) => {
      const path = cb.value.split("|");
      return {
        module: cb.dataset.module,
        path: path,
        label: cb.dataset.label,
      };
    });
    if (editingGroupIndex !== null && editingGroupIndex >= 0 && editingGroupIndex < misGrupos.length) {
      // Editar grupo existente
      misGrupos[editingGroupIndex] = { name: groupName, items: items };
    } else {
      // Crear nuevo grupo
      misGrupos.push({ name: groupName, items: items });
    }
    saveGroups();
    closeGroupModal();
    renderModule();
  }

  /**
   * Inicializa la aplicación: carga grupos de localStorage,
   * construye la lista de módulos y selecciona por defecto el
   * primero. También configura los eventos para el menú contextual.
   */
  function init() {
    loadGroups();
    buildModuleList();
    // Asigna manejadores para los botones de modal
    document.getElementById("modal-close").addEventListener("click", () => {
      closeGroupModal();
    });
    document.getElementById("modal-cancel").addEventListener("click", () => {
      closeGroupModal();
    });
    document.getElementById("modal-save").addEventListener("click", () => {
      handleSaveGroup();
    });
    // Selecciona el primer módulo (Compras) por defecto
    const firstModule = Object.keys(modulesData)[0];
    loadModule(firstModule);
    // Configurar eventos para el menú contextual
    const contextMenu = document.getElementById("group-context-menu");
    contextMenu.addEventListener("click", function (e) {
      const option = e.target.closest(".context-option");
      if (option) {
        const action = option.dataset.action;
        if (action === "edit") {
          if (contextTargetIndex != null) {
            openGroupModal(contextTargetIndex);
          }
        } else if (action === "delete") {
          if (contextTargetIndex != null) {
            deleteGroup(contextTargetIndex);
          }
        }
        hideContextMenu();
      }
    });
    // Ocultar menú contextual al hacer clic en cualquier lugar
    document.addEventListener("click", function (e) {
      if (!contextMenu.hidden) {
        hideContextMenu();
      }
    });
  }

  // Ejecutar init cuando el DOM esté listo
  document.addEventListener("DOMContentLoaded", init);
})();
