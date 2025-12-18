import React, { useState } from 'react';
import { Monitor, Box, Layers, HardDrive, Cpu, Info, Server, Plus, X, Play, Square, Trash2, Network, Database, Settings, Link2, Unlink, Zap, RotateCcw, Terminal, ChevronUp, ChevronDown, Copy, Check } from 'lucide-react';

export default function DockerVisualizer() {
  // Images state
  const [images, setImages] = useState([
    { id: 1, name: 'nginx', tag: 'latest', size: '142 MB', layers: 7 },
    { id: 2, name: 'node', tag: '18-alpine', size: '175 MB', layers: 5 },
  ]);

  // Containers state
  const [containers, setContainers] = useState([]);

  // Volumes state (Phase 2)
  const [volumes, setVolumes] = useState([
    { id: 1, name: 'app-data', driver: 'local', size: '256 MB' },
  ]);

  // Networks state (Phase 2)
  const [networks, setNetworks] = useState([
    { id: 1, name: 'bridge', driver: 'bridge', isDefault: true, containers: [] },
    { id: 2, name: 'host', driver: 'host', isDefault: true, containers: [] },
    { id: 3, name: 'none', driver: 'null', isDefault: true, containers: [] },
  ]);

  // Active scenario tracking
  const [activeScenario, setActiveScenario] = useState(null);

  // CLI Commands state
  const [commandHistory, setCommandHistory] = useState([]);
  const [showCliPanel, setShowCliPanel] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Modal states
  const [showAddImageModal, setShowAddImageModal] = useState(false);
  const [showAddVolumeModal, setShowAddVolumeModal] = useState(false);
  const [showAddNetworkModal, setShowAddNetworkModal] = useState(false);
  const [showRunContainerModal, setShowRunContainerModal] = useState(false);
  const [selectedImageForRun, setSelectedImageForRun] = useState(null);

  // New resource forms
  const [newImage, setNewImage] = useState({ name: '', tag: 'latest' });
  const [newVolume, setNewVolume] = useState({ name: '' });
  const [newNetwork, setNewNetwork] = useState({ name: '', driver: 'bridge' });
  const [newContainer, setNewContainer] = useState({
    name: '',
    ports: '',
    envVars: [{ key: '', value: '' }],
    volumes: [],
    network: 'bridge',
  });

  // Predefined images for quick add
  const predefinedImages = [
    { name: 'nginx', tag: 'latest', size: '142 MB', layers: 7 },
    { name: 'node', tag: '18-alpine', size: '175 MB', layers: 5 },
    { name: 'postgres', tag: '15', size: '379 MB', layers: 13 },
    { name: 'redis', tag: 'alpine', size: '30 MB', layers: 5 },
    { name: 'python', tag: '3.11-slim', size: '125 MB', layers: 5 },
    { name: 'mongo', tag: 'latest', size: '695 MB', layers: 10 },
    { name: 'mysql', tag: '8', size: '544 MB', layers: 11 },
    { name: 'alpine', tag: 'latest', size: '7 MB', layers: 1 },
  ];

  // Simple inline tooltip component
  const InfoTooltip = ({ content, children, position = 'top' }) => {
    const [isVisible, setIsVisible] = useState(false);

    const positionClasses = {
      top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    return (
      <div 
        className="relative inline-flex"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
        {isVisible && (
          <div className={`absolute ${positionClasses[position]} z-50 w-72 p-3 bg-slate-900 border-2 border-blue-400 rounded-lg shadow-xl text-xs text-slate-200 whitespace-normal`}>
            {content}
            <div className={`absolute w-3 h-3 bg-slate-900 border-blue-400 transform rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1.5 border-r-2 border-b-2' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1.5 border-l-2 border-t-2' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1.5 border-t-2 border-r-2' :
              'right-full top-1/2 -translate-y-1/2 -mr-1.5 border-b-2 border-l-2'
            }`} />
          </div>
        )}
      </div>
    );
  };

  // ============ CLI COMMAND HELPERS ============
  const recordCommand = (cmd) => {
    setCommandHistory(prev => [...prev, { cmd, timestamp: new Date().toLocaleTimeString() }].slice(-20));
  };

  const copyCommand = (cmd, index) => {
    navigator.clipboard.writeText(cmd);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  const clearHistory = () => {
    setCommandHistory([]);
  };

  // ============ IMAGE HANDLERS ============
  const addImage = (image) => {
    const exists = images.find(i => i.name === image.name && i.tag === image.tag);
    if (!exists) {
      setImages([...images, { ...image, id: Date.now() }]);
      recordCommand(`docker pull ${image.name}:${image.tag}`);
    }
    setShowAddImageModal(false);
    setNewImage({ name: '', tag: 'latest' });
  };

  const removeImage = (id) => {
    const image = images.find(i => i.id === id);
    const inUse = containers.some(c => c.image === `${image.name}:${image.tag}`);
    if (inUse) {
      alert('Cannot remove image - it is being used by a container!');
      return;
    }
    setImages(images.filter(i => i.id !== id));
    recordCommand(`docker rmi ${image.name}:${image.tag}`);
  };

  // ============ CONTAINER HANDLERS ============
  const openRunContainerModal = (image) => {
    setSelectedImageForRun(image);
    const defaultPorts = image.name === 'nginx' ? '8080:80' : 
                         image.name === 'postgres' ? '5432:5432' : 
                         image.name === 'redis' ? '6379:6379' :
                         image.name === 'mysql' ? '3306:3306' :
                         image.name === 'mongo' ? '27017:27017' : '';
    setNewContainer({
      name: `${image.name}-${Math.random().toString(36).substr(2, 4)}`,
      ports: defaultPorts,
      envVars: image.name === 'postgres' ? [{ key: 'POSTGRES_PASSWORD', value: 'secret' }] :
               image.name === 'mysql' ? [{ key: 'MYSQL_ROOT_PASSWORD', value: 'secret' }] :
               [{ key: '', value: '' }],
      volumes: [],
      network: 'bridge',
    });
    setShowRunContainerModal(true);
  };

  const createContainer = () => {
    if (!selectedImageForRun) return;
    
    const containerName = newContainer.name || `${selectedImageForRun.name}-${Math.random().toString(36).substr(2, 4)}`;
    const container = {
      id: Date.now(),
      name: containerName,
      image: `${selectedImageForRun.name}:${selectedImageForRun.tag}`,
      status: 'running',
      ports: newContainer.ports || null,
      envVars: newContainer.envVars.filter(e => e.key),
      volumes: newContainer.volumes,
      network: newContainer.network,
    };
    
    setContainers([...containers, container]);
    
    // Update network to include this container
    setNetworks(networks.map(n => 
      n.name === container.network 
        ? { ...n, containers: [...n.containers, container.id] }
        : n
    ));
    
    // Build docker run command
    let cmd = `docker run -d --name ${containerName}`;
    if (newContainer.ports) cmd += ` -p ${newContainer.ports}`;
    if (newContainer.network !== 'bridge') cmd += ` --network ${newContainer.network}`;
    newContainer.envVars.filter(e => e.key).forEach(e => {
      cmd += ` -e ${e.key}=${e.value}`;
    });
    newContainer.volumes.forEach(v => {
      cmd += ` -v ${v}:/data`;
    });
    cmd += ` ${selectedImageForRun.name}:${selectedImageForRun.tag}`;
    recordCommand(cmd);
    
    setShowRunContainerModal(false);
    setSelectedImageForRun(null);
  };

  const toggleContainer = (id) => {
    const container = containers.find(c => c.id === id);
    const newStatus = container.status === 'running' ? 'stopped' : 'running';
    setContainers(containers.map(c => 
      c.id === id ? { ...c, status: newStatus } : c
    ));
    recordCommand(newStatus === 'running' ? `docker start ${container.name}` : `docker stop ${container.name}`);
  };

  const removeContainer = (id) => {
    const container = containers.find(c => c.id === id);
    if (container.status === 'running') {
      alert('Stop the container before removing it!');
      return;
    }
    // Remove from network
    setNetworks(networks.map(n => ({
      ...n,
      containers: n.containers.filter(cId => cId !== id)
    })));
    setContainers(containers.filter(c => c.id !== id));
    recordCommand(`docker rm ${container.name}`);
  };

  // ============ VOLUME HANDLERS ============
  const addVolume = () => {
    if (!newVolume.name) return;
    const exists = volumes.find(v => v.name === newVolume.name);
    if (exists) {
      alert('Volume with this name already exists!');
      return;
    }
    setVolumes([...volumes, { 
      id: Date.now(), 
      name: newVolume.name, 
      driver: 'local',
      size: '0 MB'
    }]);
    setShowAddVolumeModal(false);
    recordCommand(`docker volume create ${newVolume.name}`);
    setNewVolume({ name: '' });
  };

  const removeVolume = (id) => {
    const volume = volumes.find(v => v.id === id);
    const inUse = containers.some(c => c.volumes?.includes(volume.name));
    if (inUse) {
      alert('Cannot remove volume - it is being used by a container!');
      return;
    }
    setVolumes(volumes.filter(v => v.id !== id));
    recordCommand(`docker volume rm ${volume.name}`);
  };

  // ============ NETWORK HANDLERS ============
  const addNetwork = () => {
    if (!newNetwork.name) return;
    const exists = networks.find(n => n.name === newNetwork.name);
    if (exists) {
      alert('Network with this name already exists!');
      return;
    }
    setNetworks([...networks, { 
      id: Date.now(), 
      name: newNetwork.name, 
      driver: newNetwork.driver,
      isDefault: false,
      containers: []
    }]);
    setShowAddNetworkModal(false);
    recordCommand(`docker network create --driver ${newNetwork.driver} ${newNetwork.name}`);
    setNewNetwork({ name: '', driver: 'bridge' });
  };

  const removeNetwork = (id) => {
    const network = networks.find(n => n.id === id);
    if (network.isDefault) {
      alert('Cannot remove default Docker networks!');
      return;
    }
    if (network.containers.length > 0) {
      alert('Cannot remove network - containers are connected to it!');
      return;
    }
    setNetworks(networks.filter(n => n.id !== id));
    recordCommand(`docker network rm ${network.name}`);
  };

  // ============ SCENARIOS ============
  const scenarios = [
    {
      id: 'hello-world',
      name: '🌍 Hello World',
      description: 'Single nginx container serving a webpage',
      difficulty: 'Beginner',
      images: [{ name: 'nginx', tag: 'latest', size: '142 MB', layers: 7 }],
      containers: [
        { name: 'hello-nginx', image: 'nginx:latest', status: 'running', ports: '8080:80', network: 'bridge', envVars: [], volumes: [] }
      ],
      volumes: [],
      networks: [],
    },
    {
      id: 'web-db',
      name: '🗄️ Web + Database',
      description: 'Web server with PostgreSQL database on custom network',
      difficulty: 'Intermediate',
      images: [
        { name: 'nginx', tag: 'latest', size: '142 MB', layers: 7 },
        { name: 'postgres', tag: '15', size: '379 MB', layers: 13 }
      ],
      containers: [
        { name: 'web-server', image: 'nginx:latest', status: 'running', ports: '8080:80', network: 'app-network', envVars: [], volumes: [] },
        { name: 'database', image: 'postgres:15', status: 'running', ports: '5432:5432', network: 'app-network', envVars: [{ key: 'POSTGRES_PASSWORD', value: 'secret' }], volumes: ['db-data'] }
      ],
      volumes: [{ name: 'db-data', driver: 'local', size: '0 MB' }],
      networks: [{ name: 'app-network', driver: 'bridge' }],
    },
    {
      id: 'full-stack',
      name: '🚀 Full Stack App',
      description: 'Frontend + API + Database + Cache with volumes',
      difficulty: 'Advanced',
      images: [
        { name: 'nginx', tag: 'latest', size: '142 MB', layers: 7 },
        { name: 'node', tag: '18-alpine', size: '175 MB', layers: 5 },
        { name: 'postgres', tag: '15', size: '379 MB', layers: 13 },
        { name: 'redis', tag: 'alpine', size: '30 MB', layers: 5 }
      ],
      containers: [
        { name: 'frontend', image: 'nginx:latest', status: 'running', ports: '3000:80', network: 'fullstack-net', envVars: [], volumes: [] },
        { name: 'api', image: 'node:18-alpine', status: 'running', ports: '4000:4000', network: 'fullstack-net', envVars: [{ key: 'DB_HOST', value: 'postgres' }, { key: 'REDIS_HOST', value: 'cache' }], volumes: ['api-logs'] },
        { name: 'postgres', image: 'postgres:15', status: 'running', ports: null, network: 'fullstack-net', envVars: [{ key: 'POSTGRES_PASSWORD', value: 'secret' }, { key: 'POSTGRES_DB', value: 'myapp' }], volumes: ['pg-data'] },
        { name: 'cache', image: 'redis:alpine', status: 'running', ports: null, network: 'fullstack-net', envVars: [], volumes: [] }
      ],
      volumes: [
        { name: 'pg-data', driver: 'local', size: '0 MB' },
        { name: 'api-logs', driver: 'local', size: '0 MB' }
      ],
      networks: [{ name: 'fullstack-net', driver: 'bridge' }],
    },
    {
      id: 'microservices',
      name: '🔗 Microservices',
      description: 'Multiple services communicating over networks',
      difficulty: 'Advanced',
      images: [
        { name: 'nginx', tag: 'latest', size: '142 MB', layers: 7 },
        { name: 'node', tag: '18-alpine', size: '175 MB', layers: 5 },
        { name: 'python', tag: '3.11-slim', size: '125 MB', layers: 5 },
        { name: 'mongo', tag: 'latest', size: '695 MB', layers: 10 }
      ],
      containers: [
        { name: 'gateway', image: 'nginx:latest', status: 'running', ports: '80:80', network: 'frontend-net', envVars: [], volumes: [] },
        { name: 'user-service', image: 'node:18-alpine', status: 'running', ports: null, network: 'backend-net', envVars: [{ key: 'MONGO_URL', value: 'mongodb://users-db:27017' }], volumes: [] },
        { name: 'order-service', image: 'python:3.11-slim', status: 'running', ports: null, network: 'backend-net', envVars: [{ key: 'MONGO_URL', value: 'mongodb://orders-db:27017' }], volumes: [] },
        { name: 'users-db', image: 'mongo:latest', status: 'running', ports: null, network: 'backend-net', envVars: [], volumes: ['users-data'] },
        { name: 'orders-db', image: 'mongo:latest', status: 'running', ports: null, network: 'backend-net', envVars: [], volumes: ['orders-data'] }
      ],
      volumes: [
        { name: 'users-data', driver: 'local', size: '0 MB' },
        { name: 'orders-data', driver: 'local', size: '0 MB' }
      ],
      networks: [
        { name: 'frontend-net', driver: 'bridge' },
        { name: 'backend-net', driver: 'bridge' }
      ],
    }
  ];

  const loadScenario = (scenario) => {
    // Reset to default networks first
    const defaultNetworks = [
      { id: 1, name: 'bridge', driver: 'bridge', isDefault: true, containers: [] },
      { id: 2, name: 'host', driver: 'host', isDefault: true, containers: [] },
      { id: 3, name: 'none', driver: 'null', isDefault: true, containers: [] },
    ];
    
    // Add scenario networks
    const scenarioNetworks = scenario.networks.map((n, i) => ({
      ...n,
      id: Date.now() + i,
      isDefault: false,
      containers: []
    }));
    
    // Set images
    const scenarioImages = scenario.images.map((img, i) => ({ ...img, id: Date.now() + i + 100 }));
    
    // Set volumes
    const scenarioVolumes = scenario.volumes.map((v, i) => ({ ...v, id: Date.now() + i + 200 }));
    
    // Create containers with proper network tracking
    const allNetworks = [...defaultNetworks, ...scenarioNetworks];
    const scenarioContainers = scenario.containers.map((c, i) => {
      const containerId = Date.now() + i + 300;
      // Update network's container list
      const networkIdx = allNetworks.findIndex(n => n.name === c.network);
      if (networkIdx >= 0) {
        allNetworks[networkIdx].containers.push(containerId);
      }
      return { ...c, id: containerId };
    });
    
    setImages(scenarioImages);
    setContainers(scenarioContainers);
    setVolumes(scenarioVolumes);
    setNetworks(allNetworks);
    setActiveScenario(scenario.id);
  };

  const resetAll = () => {
    setImages([]);
    setContainers([]);
    setVolumes([]);
    setNetworks([
      { id: 1, name: 'bridge', driver: 'bridge', isDefault: true, containers: [] },
      { id: 2, name: 'host', driver: 'host', isDefault: true, containers: [] },
      { id: 3, name: 'none', driver: 'null', isDefault: true, containers: [] },
    ]);
    setActiveScenario(null);
  };

  // Stats
  const stats = {
    images: images.length,
    containersRunning: containers.filter(c => c.status === 'running').length,
    containersStopped: containers.filter(c => c.status === 'stopped').length,
    volumes: volumes.length,
    networks: networks.length,
  };

  // Tooltip content definitions
  const tooltipContent = {
    host: (
      <div>
        <strong className="text-blue-400">Host Machine</strong>
        <p className="mt-1">The physical or virtual machine where Docker is installed. This is your computer, server, or cloud instance.</p>
        <p className="mt-1 text-slate-400">Examples: Your laptop, AWS EC2, Azure VM</p>
      </div>
    ),
    hostOs: (
      <div>
        <strong className="text-green-400">Host Operating System</strong>
        <p className="mt-1">The OS kernel that Docker uses. On Linux, Docker runs natively. On Mac/Windows, Docker uses a lightweight Linux VM.</p>
      </div>
    ),
    engine: (
      <div>
        <strong className="text-blue-400">Docker Engine</strong>
        <p className="mt-1">The core of Docker! Includes:</p>
        <ul className="mt-1 list-disc list-inside text-slate-300">
          <li><strong>Docker Daemon</strong> - Background service</li>
          <li><strong>REST API</strong> - Interface for programs</li>
          <li><strong>Docker CLI</strong> - Command line tool</li>
        </ul>
      </div>
    ),
    daemon: (
      <div>
        <strong className="text-purple-400">Docker Daemon (dockerd)</strong>
        <p className="mt-1">The background service that:</p>
        <ul className="mt-1 list-disc list-inside text-slate-300">
          <li>Builds and stores images</li>
          <li>Creates and runs containers</li>
          <li>Manages networks and volumes</li>
        </ul>
      </div>
    ),
    images: (
      <div>
        <strong className="text-amber-400">Docker Images</strong>
        <p className="mt-1">Read-only templates to create containers. Like a "blueprint".</p>
        <ul className="mt-1 list-disc list-inside text-slate-300">
          <li>Built from Dockerfiles</li>
          <li>Stored in layers</li>
          <li>Shared via Docker Hub</li>
        </ul>
        <p className="mt-2 text-slate-400">Command: <code className="bg-slate-700 px-1 rounded">docker images</code></p>
      </div>
    ),
    containers: (
      <div>
        <strong className="text-cyan-400">Docker Containers</strong>
        <p className="mt-1">Running instances of images. Isolated processes with their own filesystem.</p>
        <ul className="mt-1 list-disc list-inside text-slate-300">
          <li>Created from images</li>
          <li>Can be started, stopped, deleted</li>
          <li>Ephemeral by default</li>
        </ul>
        <p className="mt-2 text-slate-400">Command: <code className="bg-slate-700 px-1 rounded">docker ps</code></p>
      </div>
    ),
    volumes: (
      <div>
        <strong className="text-pink-400">Docker Volumes</strong>
        <p className="mt-1">Persistent storage for containers. Data survives container removal!</p>
        <ul className="mt-1 list-disc list-inside text-slate-300">
          <li><strong>Named volumes</strong> - Managed by Docker</li>
          <li><strong>Bind mounts</strong> - Host path mapping</li>
          <li>Can be shared between containers</li>
        </ul>
        <p className="mt-2 text-slate-400">Command: <code className="bg-slate-700 px-1 rounded">docker volume ls</code></p>
      </div>
    ),
    networks: (
      <div>
        <strong className="text-indigo-400">Docker Networks</strong>
        <p className="mt-1">Enable container communication:</p>
        <ul className="mt-1 list-disc list-inside text-slate-300">
          <li><strong>bridge</strong> - Default, isolated network</li>
          <li><strong>host</strong> - Use host's network directly</li>
          <li><strong>none</strong> - No networking</li>
          <li><strong>custom</strong> - User-defined networks</li>
        </ul>
        <p className="mt-2 text-slate-400">Command: <code className="bg-slate-700 px-1 rounded">docker network ls</code></p>
      </div>
    ),
    storage: (
      <div>
        <strong className="text-orange-400">Host Storage</strong>
        <p className="mt-1">Where Docker stores all its data:</p>
        <ul className="mt-1 list-disc list-inside text-slate-300">
          <li>Images and layers</li>
          <li>Container filesystems</li>
          <li>Volumes for persistent data</li>
        </ul>
        <p className="mt-2 text-slate-400">Location: <code className="bg-slate-700 px-1 rounded">/var/lib/docker</code></p>
      </div>
    ),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
          🐳 Docker Visualizer
        </h1>
        <p className="text-slate-400">Learn Docker concepts visually - hover over <Info className="inline w-4 h-4 text-blue-400" /> icons for info</p>
      </div>

      {/* Stats Bar */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="flex gap-3 justify-center flex-wrap">
          <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
            <span className="text-amber-400 font-semibold">{stats.images}</span>
            <span className="text-slate-400 ml-2 text-sm">Images</span>
          </div>
          <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
            <span className="text-green-400 font-semibold">{stats.containersRunning}</span>
            <span className="text-slate-400 ml-2 text-sm">Running</span>
          </div>
          <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
            <span className="text-red-400 font-semibold">{stats.containersStopped}</span>
            <span className="text-slate-400 ml-2 text-sm">Stopped</span>
          </div>
          <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
            <span className="text-pink-400 font-semibold">{stats.volumes}</span>
            <span className="text-slate-400 ml-2 text-sm">Volumes</span>
          </div>
          <div className="bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-700">
            <span className="text-indigo-400 font-semibold">{stats.networks}</span>
            <span className="text-slate-400 ml-2 text-sm">Networks</span>
          </div>
        </div>
      </div>

      {/* Scenarios Section */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <span className="font-semibold text-slate-200">Quick Scenarios</span>
              <span className="text-xs text-slate-500">Load pre-built examples to learn</span>
            </div>
            {activeScenario && (
              <button
                onClick={resetAll}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-red-400 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {scenarios.map(scenario => (
              <button
                key={scenario.id}
                onClick={() => loadScenario(scenario)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  activeScenario === scenario.id
                    ? 'bg-yellow-500/20 border-yellow-500/50 ring-2 ring-yellow-500/30'
                    : 'bg-slate-700/50 border-slate-600 hover:border-yellow-500/30 hover:bg-slate-700'
                }`}
              >
                <div className="font-medium text-sm">{scenario.name}</div>
                <div className="text-xs text-slate-400 mt-1">{scenario.description}</div>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    scenario.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                    scenario.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {scenario.difficulty}
                  </span>
                  <span className="text-xs text-slate-500">
                    {scenario.containers.length} containers
                  </span>
                </div>
                {activeScenario === scenario.id && (
                  <div className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Active
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Visualization */}
      <div className="max-w-6xl mx-auto">
        
        {/* Host Machine */}
        <div className="border-2 border-slate-600 rounded-xl p-6 bg-slate-800/50 backdrop-blur">
          {/* Host Header */}
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-700">
            <Monitor className="w-8 h-8 text-slate-400" />
            <div>
              <h2 className="text-xl font-semibold text-slate-200">Host Machine</h2>
              <p className="text-sm text-slate-500">Linux / macOS / Windows</p>
            </div>
            <InfoTooltip content={tooltipContent.host} position="bottom">
              <Info className="w-5 h-5 text-blue-400 cursor-help hover:text-blue-300" />
            </InfoTooltip>
          </div>

          {/* Host OS Layer */}
          <div className="mb-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-green-400" />
              <span className="text-sm font-medium text-slate-300">Host OS Kernel</span>
              <InfoTooltip content={tooltipContent.hostOs} position="right">
                <Info className="w-4 h-4 text-blue-400 cursor-help hover:text-blue-300 ml-1" />
              </InfoTooltip>
            </div>
          </div>

          {/* Docker Engine */}
          <div className="border-2 border-blue-500/50 rounded-xl p-5 bg-gradient-to-br from-blue-900/30 to-cyan-900/30">
            {/* Docker Engine Header */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-blue-500/30">
              <div className="text-3xl">🐳</div>
              <div>
                <h3 className="text-lg font-semibold text-blue-300">Docker Engine</h3>
                <p className="text-xs text-blue-400/70">Container Runtime</p>
              </div>
              <InfoTooltip content={tooltipContent.engine} position="bottom">
                <Info className="w-5 h-5 text-blue-400 cursor-help hover:text-blue-300 ml-auto" />
              </InfoTooltip>
            </div>

            {/* Docker Daemon */}
            <div className="mb-4 p-3 bg-purple-900/30 rounded-lg border border-purple-500/30">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-purple-400" />
                <span className="font-medium text-purple-300">Docker Daemon</span>
                <span className="text-xs text-purple-400/60 ml-1">dockerd</span>
                <InfoTooltip content={tooltipContent.daemon} position="right">
                  <Info className="w-4 h-4 text-blue-400 cursor-help hover:text-blue-300 ml-1" />
                </InfoTooltip>
                <div className="ml-auto flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Running</span>
                </div>
              </div>
            </div>

            {/* Two Column Layout for Images/Containers and Volumes/Networks */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Left Column: Images & Containers */}
              <div className="space-y-4">
                {/* Images Section */}
                <div className="p-4 bg-amber-900/20 rounded-lg border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="w-5 h-5 text-amber-400" />
                    <span className="font-medium text-amber-300">Images</span>
                    <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">{images.length}</span>
                    <InfoTooltip content={tooltipContent.images} position="left">
                      <Info className="w-4 h-4 text-blue-400 cursor-help hover:text-blue-300 ml-1" />
                    </InfoTooltip>
                    <button 
                      onClick={() => setShowAddImageModal(true)}
                      className="ml-auto bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 p-1 rounded transition-colors"
                      title="Pull Image"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {images.length === 0 ? (
                      <div className="text-xs text-slate-400 italic text-center py-2">No images</div>
                    ) : (
                      images.map(image => (
                        <div key={image.id} className="flex items-center gap-2 bg-slate-800/50 p-2 rounded border border-amber-500/20">
                          <Layers className="w-4 h-4 text-amber-400/70" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-amber-200 truncate">{image.name}:{image.tag}</div>
                            <div className="text-xs text-slate-500">{image.size}</div>
                          </div>
                          <button 
                            onClick={() => openRunContainerModal(image)}
                            className="p-1 hover:bg-green-500/20 rounded text-green-400 transition-colors"
                            title="Run container"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => removeImage(image.id)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                            title="Remove image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Containers Section */}
                <div className="p-4 bg-cyan-900/20 rounded-lg border border-cyan-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Box className="w-5 h-5 text-cyan-400" />
                    <span className="font-medium text-cyan-300">Containers</span>
                    <span className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">{containers.length}</span>
                    <InfoTooltip content={tooltipContent.containers} position="left">
                      <Info className="w-4 h-4 text-blue-400 cursor-help hover:text-blue-300 ml-1" />
                    </InfoTooltip>
                  </div>
                  
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {containers.length === 0 ? (
                      <div className="min-h-[60px] flex items-center justify-center border-2 border-dashed border-slate-600 rounded-lg">
                        <span className="text-slate-500 text-sm">No containers</span>
                      </div>
                    ) : (
                      containers.map(container => (
                        <div 
                          key={container.id} 
                          className={`p-2 rounded border ${
                            container.status === 'running' 
                              ? 'bg-green-900/20 border-green-500/30' 
                              : 'bg-slate-800/50 border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Box className={`w-4 h-4 ${container.status === 'running' ? 'text-green-400' : 'text-slate-400'}`} />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-cyan-200 truncate">{container.name}</div>
                              <div className="text-xs text-slate-500">{container.image}</div>
                            </div>
                            <div className={`text-xs px-2 py-0.5 rounded-full ${
                              container.status === 'running' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                              {container.status}
                            </div>
                            <button 
                              onClick={() => toggleContainer(container.id)}
                              className={`p-1 rounded transition-colors ${
                                container.status === 'running' ? 'hover:bg-yellow-500/20 text-yellow-400' : 'hover:bg-green-500/20 text-green-400'
                              }`}
                            >
                              {container.status === 'running' ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            </button>
                            <button 
                              onClick={() => removeContainer(container.id)}
                              className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          {/* Container details */}
                          <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs space-y-1">
                            {container.ports && (
                              <div className="flex items-center gap-1 text-blue-400">
                                <span className="text-slate-500">Ports:</span> {container.ports}
                              </div>
                            )}
                            {container.network && (
                              <div className="flex items-center gap-1 text-indigo-400">
                                <Network className="w-3 h-3" />
                                <span className="text-slate-500">Network:</span> {container.network}
                              </div>
                            )}
                            {container.volumes?.length > 0 && (
                              <div className="flex items-center gap-1 text-pink-400">
                                <Database className="w-3 h-3" />
                                <span className="text-slate-500">Volumes:</span> {container.volumes.join(', ')}
                              </div>
                            )}
                            {container.envVars?.length > 0 && container.envVars[0]?.key && (
                              <div className="flex items-center gap-1 text-yellow-400">
                                <Settings className="w-3 h-3" />
                                <span className="text-slate-500">Env:</span> {container.envVars.map(e => e.key).join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Volumes & Networks */}
              <div className="space-y-4">
                {/* Volumes Section */}
                <div className="p-4 bg-pink-900/20 rounded-lg border border-pink-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Database className="w-5 h-5 text-pink-400" />
                    <span className="font-medium text-pink-300">Volumes</span>
                    <span className="text-xs bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full">{volumes.length}</span>
                    <InfoTooltip content={tooltipContent.volumes} position="left">
                      <Info className="w-4 h-4 text-blue-400 cursor-help hover:text-blue-300 ml-1" />
                    </InfoTooltip>
                    <button 
                      onClick={() => setShowAddVolumeModal(true)}
                      className="ml-auto bg-pink-500/20 hover:bg-pink-500/40 text-pink-300 p-1 rounded transition-colors"
                      title="Create Volume"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {volumes.length === 0 ? (
                      <div className="text-xs text-slate-400 italic text-center py-2">No volumes</div>
                    ) : (
                      volumes.map(volume => (
                        <div key={volume.id} className="flex items-center gap-2 bg-slate-800/50 p-2 rounded border border-pink-500/20">
                          <Database className="w-4 h-4 text-pink-400/70" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-pink-200 truncate">{volume.name}</div>
                            <div className="text-xs text-slate-500">{volume.driver} • {volume.size}</div>
                          </div>
                          <button 
                            onClick={() => removeVolume(volume.id)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                            title="Remove volume"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Networks Section */}
                <div className="p-4 bg-indigo-900/20 rounded-lg border border-indigo-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Network className="w-5 h-5 text-indigo-400" />
                    <span className="font-medium text-indigo-300">Networks</span>
                    <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">{networks.length}</span>
                    <InfoTooltip content={tooltipContent.networks} position="left">
                      <Info className="w-4 h-4 text-blue-400 cursor-help hover:text-blue-300 ml-1" />
                    </InfoTooltip>
                    <button 
                      onClick={() => setShowAddNetworkModal(true)}
                      className="ml-auto bg-indigo-500/20 hover:bg-indigo-500/40 text-indigo-300 p-1 rounded transition-colors"
                      title="Create Network"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {networks.map(network => (
                      <div key={network.id} className="flex items-center gap-2 bg-slate-800/50 p-2 rounded border border-indigo-500/20">
                        <Network className="w-4 h-4 text-indigo-400/70" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-indigo-200 truncate">
                            {network.name}
                            {network.isDefault && <span className="ml-1 text-xs text-slate-500">(default)</span>}
                          </div>
                          <div className="text-xs text-slate-500">
                            {network.driver} • {network.containers.length} containers
                          </div>
                        </div>
                        {!network.isDefault && (
                          <button 
                            onClick={() => removeNetwork(network.id)}
                            className="p-1 hover:bg-red-500/20 rounded text-red-400 transition-colors"
                            title="Remove network"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Network Visualization */}
                {containers.length > 0 && (
                  <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-600">
                    <div className="text-xs font-medium text-slate-400 mb-2">Network Connections</div>
                    <div className="space-y-2">
                      {networks.filter(n => n.containers.length > 0).map(network => (
                        <div key={network.id} className="p-2 bg-indigo-900/20 rounded border border-indigo-500/20">
                          <div className="text-xs font-medium text-indigo-300 mb-1">{network.name}</div>
                          <div className="flex flex-wrap gap-1">
                            {network.containers.map(cId => {
                              const container = containers.find(c => c.id === cId);
                              return container ? (
                                <span key={cId} className={`text-xs px-2 py-0.5 rounded ${
                                  container.status === 'running' ? 'bg-green-500/20 text-green-300' : 'bg-slate-600 text-slate-400'
                                }`}>
                                  {container.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="mt-4 p-3 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-orange-400" />
              <span className="text-sm font-medium text-slate-300">Host Storage</span>
              <InfoTooltip content={tooltipContent.storage} position="top">
                <Info className="w-4 h-4 text-blue-400 cursor-help hover:text-blue-300 ml-1" />
              </InfoTooltip>
              <span className="text-xs text-slate-500 ml-auto">/var/lib/docker</span>
            </div>
          </div>

        </div>

        {/* Legend */}
        <div className="mt-8 p-4 bg-slate-800/30 rounded-lg border border-slate-700">
          <h4 className="text-sm font-semibold text-slate-400 mb-3">💡 Quick Guide</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-500">
            <div>
              <p>• <strong>Images</strong> → Blueprints to create containers</p>
              <p>• <strong>Containers</strong> → Running instances of images</p>
              <p>• <strong>Volumes</strong> → Persistent storage for data</p>
            </div>
            <div>
              <p>• <strong>Networks</strong> → Connect containers together</p>
              <p>• <strong>Env Vars</strong> → Configure container behavior</p>
              <p>• <strong>Ports</strong> → Expose services to host</p>
            </div>
          </div>
        </div>

      </div>

      {/* ============ MODALS ============ */}
      
      {/* Add Image Modal */}
      {showAddImageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-200">Pull Docker Image</h3>
              <button onClick={() => setShowAddImageModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-slate-400 mb-2">Quick add popular images:</p>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {predefinedImages.filter(p => !images.find(i => i.name === p.name && i.tag === p.tag)).map(image => (
                  <button
                    key={`${image.name}:${image.tag}`}
                    onClick={() => addImage(image)}
                    className="text-left p-2 bg-slate-700/50 hover:bg-slate-700 rounded border border-slate-600 transition-colors"
                  >
                    <div className="text-sm font-medium text-amber-300">{image.name}</div>
                    <div className="text-xs text-slate-500">:{image.tag} • {image.size}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-700 pt-4">
              <p className="text-sm text-slate-400 mb-2">Or add custom image:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Image name"
                  value={newImage.name}
                  onChange={(e) => setNewImage({ ...newImage, name: e.target.value })}
                  className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  placeholder="Tag"
                  value={newImage.tag}
                  onChange={(e) => setNewImage({ ...newImage, tag: e.target.value })}
                  className="w-20 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={() => newImage.name && addImage({ ...newImage, size: '~100 MB', layers: 5 })}
                  disabled={!newImage.name}
                  className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-medium transition-colors"
                >
                  Pull
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Volume Modal */}
      {showAddVolumeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-200">Create Volume</h3>
              <button onClick={() => setShowAddVolumeModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">Volume Name</label>
                <input
                  type="text"
                  placeholder="my-volume"
                  value={newVolume.name}
                  onChange={(e) => setNewVolume({ ...newVolume, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="bg-slate-700/50 p-3 rounded text-xs text-slate-400">
                <p className="font-medium text-slate-300 mb-1">💡 About Volumes:</p>
                <p>Volumes persist data outside containers. They survive container removal and can be shared between containers.</p>
              </div>
              <button
                onClick={addVolume}
                disabled={!newVolume.name}
                className="w-full bg-pink-600 hover:bg-pink-500 disabled:bg-slate-600 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Create Volume
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Network Modal */}
      {showAddNetworkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 border border-slate-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-200">Create Network</h3>
              <button onClick={() => setShowAddNetworkModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">Network Name</label>
                <input
                  type="text"
                  placeholder="my-network"
                  value={newNetwork.name}
                  onChange={(e) => setNewNetwork({ ...newNetwork, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-400 block mb-1">Driver</label>
                <select
                  value={newNetwork.driver}
                  onChange={(e) => setNewNetwork({ ...newNetwork, driver: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="bridge">bridge (default, isolated)</option>
                  <option value="overlay">overlay (swarm multi-host)</option>
                  <option value="macvlan">macvlan (physical network)</option>
                </select>
              </div>
              <div className="bg-slate-700/50 p-3 rounded text-xs text-slate-400">
                <p className="font-medium text-slate-300 mb-1">💡 About Networks:</p>
                <p>Custom networks allow containers to communicate by name. Containers on the same network can reach each other.</p>
              </div>
              <button
                onClick={addNetwork}
                disabled={!newNetwork.name}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-600 disabled:cursor-not-allowed px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                Create Network
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Run Container Modal */}
      {showRunContainerModal && selectedImageForRun && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4 border border-slate-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-200">
                Run Container from {selectedImageForRun.name}:{selectedImageForRun.tag}
              </h3>
              <button onClick={() => setShowRunContainerModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Container Name */}
              <div>
                <label className="text-sm text-slate-400 block mb-1">Container Name</label>
                <input
                  type="text"
                  placeholder="my-container"
                  value={newContainer.name}
                  onChange={(e) => setNewContainer({ ...newContainer, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Ports */}
              <div>
                <label className="text-sm text-slate-400 block mb-1">Port Mapping (host:container)</label>
                <input
                  type="text"
                  placeholder="8080:80"
                  value={newContainer.ports}
                  onChange={(e) => setNewContainer({ ...newContainer, ports: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-slate-500 mt-1">Maps host port to container port</p>
              </div>

              {/* Network */}
              <div>
                <label className="text-sm text-slate-400 block mb-1">Network</label>
                <select
                  value={newContainer.network}
                  onChange={(e) => setNewContainer({ ...newContainer, network: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {networks.map(n => (
                    <option key={n.id} value={n.name}>{n.name} ({n.driver})</option>
                  ))}
                </select>
              </div>

              {/* Volumes */}
              <div>
                <label className="text-sm text-slate-400 block mb-1">Mount Volumes</label>
                <div className="space-y-2">
                  {volumes.map(v => (
                    <label key={v.id} className="flex items-center gap-2 text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={newContainer.volumes.includes(v.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewContainer({ ...newContainer, volumes: [...newContainer.volumes, v.name] });
                          } else {
                            setNewContainer({ ...newContainer, volumes: newContainer.volumes.filter(vn => vn !== v.name) });
                          }
                        }}
                        className="rounded bg-slate-700 border-slate-600"
                      />
                      {v.name}
                    </label>
                  ))}
                  {volumes.length === 0 && (
                    <p className="text-xs text-slate-500 italic">No volumes available</p>
                  )}
                </div>
              </div>

              {/* Environment Variables */}
              <div>
                <label className="text-sm text-slate-400 block mb-1">Environment Variables</label>
                <div className="space-y-2">
                  {newContainer.envVars.map((env, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="KEY"
                        value={env.key}
                        onChange={(e) => {
                          const updated = [...newContainer.envVars];
                          updated[idx].key = e.target.value;
                          setNewContainer({ ...newContainer, envVars: updated });
                        }}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <input
                        type="text"
                        placeholder="value"
                        value={env.value}
                        onChange={(e) => {
                          const updated = [...newContainer.envVars];
                          updated[idx].value = e.target.value;
                          setNewContainer({ ...newContainer, envVars: updated });
                        }}
                        className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      />
                      <button
                        onClick={() => {
                          const updated = newContainer.envVars.filter((_, i) => i !== idx);
                          setNewContainer({ ...newContainer, envVars: updated.length ? updated : [{ key: '', value: '' }] });
                        }}
                        className="p-2 hover:bg-red-500/20 rounded text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setNewContainer({ ...newContainer, envVars: [...newContainer.envVars, { key: '', value: '' }] })}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    + Add variable
                  </button>
                </div>
              </div>

              <button
                onClick={createContainer}
                className="w-full bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm font-medium transition-colors"
              >
                🚀 Run Container
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CLI Commands Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-40">
        <div className="max-w-6xl mx-auto px-6">
          <div className={`bg-slate-900 border-t-2 border-x-2 border-slate-700 rounded-t-xl transition-all ${showCliPanel ? 'h-48' : 'h-10'}`}>
            {/* Panel Header */}
            <button
              onClick={() => setShowCliPanel(!showCliPanel)}
              className="w-full flex items-center justify-between px-4 py-2 hover:bg-slate-800/50 transition-colors rounded-t-xl"
            >
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-slate-300">Docker Commands</span>
                <span className="text-xs text-slate-500">({commandHistory.length} commands)</span>
              </div>
              <div className="flex items-center gap-2">
                {commandHistory.length > 0 && showCliPanel && (
                  <span
                    onClick={(e) => { e.stopPropagation(); clearHistory(); }}
                    className="text-xs text-slate-500 hover:text-red-400 cursor-pointer"
                  >
                    Clear
                  </span>
                )}
                {showCliPanel ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
              </div>
            </button>
            
            {/* Commands List */}
            {showCliPanel && (
              <div className="h-36 overflow-y-auto px-4 pb-3">
                {commandHistory.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    <Terminal className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>Perform actions to see equivalent Docker commands</p>
                    <p className="text-xs mt-1">Pull an image, run a container, create a volume...</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {commandHistory.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 group">
                        <span className="text-xs text-slate-600 w-16 flex-shrink-0">{item.timestamp}</span>
                        <code className="flex-1 text-sm text-green-400 font-mono bg-slate-800 px-2 py-1 rounded truncate">
                          $ {item.cmd}
                        </code>
                        <button
                          onClick={() => copyCommand(item.cmd, idx)}
                          className="p-1 opacity-0 group-hover:opacity-100 hover:bg-slate-700 rounded transition-all"
                          title="Copy command"
                        >
                          {copiedIndex === idx ? (
                            <Check className="w-3 h-3 text-green-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-slate-400" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom padding to account for CLI panel */}
      <div className="h-12"></div>
    </div>
  );
}
