import {Column,CreateDateColumn,Entity,Index,IsNull,JoinColumn,ManyToOne,MoreThan,OneToMany, PrimaryGeneratedColumn} from "typeorm";
import {Heartbeat as HeartbeatEntity} from './Heartbeat'
import {MonitorNotification} from './MonitorNotification'
import {Proxy as ProxyEntity} from './Proxy'
import {DockerHost as DockerHostEntity} from './DockerHost'
import {MonitorTag} from './MonitorTag'
import {MonitorGroup} from './MonitorGroup'
import {MonitorMaintenance} from './MonitorMaintenance'

@Index("proxy_id",["proxyId",],{  })
@Index("user_id",["userId",],{  })
@Entity("monitor")
export  class Monitor {

@PrimaryGeneratedColumn({type: "integer", name:"id" })
id:number;

@Column("varchar",{ name:"name",nullable:true,length:150 })
name:string | null;

@Column("boolean",{ name:"active",default: true, })
active:boolean;

@Column("integer",{ name:"user_id", nullable:true })
userId:number | null;

@Column("integer",{ name:"interval",default: 20, })
interval:number;

@Column("text",{ name:"url",nullable:true })
url:string | null;

@Column("varchar",{ name:"type",nullable:true,length:20 })
type:string | null;

@Column("integer",{ name:"weight",nullable:true,default: 2000, })
weight:number | null;

@Column("varchar",{ name:"hostname",nullable:true,length:255 })
hostname:string | null;

@Column("integer",{ name:"port",nullable:true })
port:number | null;

@CreateDateColumn({ name:"created_date"})
createdDate:Date;

@Column("varchar",{ name:"keyword",nullable:true,length:255 })
keyword:string | null;

@Column("integer",{ name:"maxretries",default: 0, })
maxretries:number;

@Column("boolean",{ name:"ignore_tls",default: false, })
ignoreTls:boolean;

@Column("boolean",{ name:"upside_down",default: false, })
upsideDown:boolean;

@Column("integer",{ name:"maxredirects",default: 10, })
maxredirects:number;

@Column("text",{ name:"accepted_statuscodes_json",default: "[\"200-299\"]", })
acceptedStatuscodesJson:string;

@Column("varchar",{ name:"dns_resolve_type",nullable:true,length:5 })
dnsResolveType:string | null;

@Column("varchar",{ name:"dns_resolve_server",nullable:true,length:255 })
dnsResolveServer:string | null;

@Column("varchar",{ name:"dns_last_result",nullable:true,length:255 })
dnsLastResult:string | null;

@Column("integer",{ name:"retry_interval",default: 0, })
retryInterval:number;

@Column("varchar",{ name:"push_token",nullable:true,length:20,default: "NULL", })
pushToken:string | null;

@Column("text",{ name:"method",default: "GET", })
method:string;

@Column("text",{ name:"body",nullable:true,default: "null", })
body:string | null;

@Column("text",{ name:"headers",nullable:true,default: "null", })
headers:string | null;

@Column("text",{ name:"basic_auth_user",nullable:true,default: "null", })
basicAuthUser:string | null;

@Column("text",{ name:"basic_auth_pass",nullable:true,default: "null", })
basicAuthPass:string | null;

@Column("varchar",{ name:"docker_container",nullable:true,length:255 })
dockerContainer:string | null;

@Column("integer",{ name:"proxy_id",nullable:true })
proxyId:number | null;

@Column("boolean",{ name:"expiry_notification",nullable:true,default: true, })
expiryNotification:boolean | null;

@Column("text",{ name:"mqtt_topic",nullable:true })
mqttTopic:string | null;

@Column("varchar",{ name:"mqtt_success_message",nullable:true,length:255 })
mqttSuccessMessage:string | null;

@Column("varchar",{ name:"mqtt_username",nullable:true,length:255 })
mqttUsername:string | null;

@Column("varchar",{ name:"mqtt_password",nullable:true,length:255 })
mqttPassword:string | null;

@Column("varchar",{ name:"database_connection_string",nullable:true,length:2000 })
databaseConnectionString:string | null;

@Column("text",{ name:"database_query",nullable:true })
databaseQuery:string | null;

@Column("varchar",{ name:"auth_method",nullable:true,length:250 })
authMethod:string | null;

@Column("text",{ name:"auth_domain",nullable:true })
authDomain:string | null;

@Column("text",{ name:"auth_workstation",nullable:true })
authWorkstation:string | null;

@Column("varchar",{ name:"grpc_url",nullable:true,length:255,default: "null", })
grpcUrl:string | null;

@Column("text",{ name:"grpc_protobuf",nullable:true,default: "null", })
grpcProtobuf:string | null;

@Column("text",{ name:"grpc_body",nullable:true,default: "null", })
grpcBody:string | null;

@Column("text",{ name:"grpc_metadata",nullable:true,default: "null", })
grpcMetadata:string | null;

@Column("varchar",{ name:"grpc_method",nullable:true,length:255,default: "null", })
grpcMethod:string | null;

@Column("varchar",{ name:"grpc_service_name",nullable:true,length:255,default: "null", })
grpcServiceName:string | null;

@Column("boolean",{ name:"grpc_enable_tls",default: false, })
grpcEnableTls:boolean;

@Column("varchar",{ name:"radius_username",nullable:true,length:255 })
radiusUsername:string | null;

@Column("varchar",{ name:"radius_password",nullable:true,length:255 })
radiusPassword:string | null;

@Column("varchar",{ name:"radius_calling_station_id",nullable:true,length:50 })
radiusCallingStationId:string | null;

@Column("varchar",{ name:"radius_called_station_id",nullable:true,length:50 })
radiusCalledStationId:string | null;

@Column("varchar",{ name:"radius_secret",nullable:true,length:255 })
radiusSecret:string | null;

@Column("integer",{ name:"resend_interval",default: 0, })
resendInterval:number;

@OneToMany(()=>HeartbeatEntity,heartbeat=>heartbeat.monitor)
heartbeats:HeartbeatEntity[];

@OneToMany(()=>MonitorNotification,monitorNotification=>monitorNotification.monitor)
monitorNotifications:MonitorNotification[];

@ManyToOne(()=>ProxyEntity,proxy=>proxy.monitors)
@JoinColumn([{ name: "proxy_id", referencedColumnName: "id" },
])
proxy:ProxyEntity;

@ManyToOne(()=>DockerHostEntity,dockerHost=>dockerHost.monitors)
@JoinColumn([{ name: "docker_host", referencedColumnName: "id" },
])
dockerHost:DockerHostEntity;

@OneToMany(()=>MonitorTag,monitorTag=>monitorTag.monitor)
monitorTags:MonitorTag[];

@OneToMany(()=>MonitorGroup,monitorGroup=>monitorGroup.monitor)
monitorGroups:MonitorGroup[];

@OneToMany(()=>MonitorMaintenance,monitorMaintenance=>monitorMaintenance.monitor)
monitorMaintenances:MonitorMaintenance[];

}
