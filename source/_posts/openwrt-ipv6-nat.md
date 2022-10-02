---
title: OpenWRT使用nftables实现IPv6 NAT
date: 2022-09-26 14:20:40
categories:
- Blog
tags:
- 网络
- OpenWRT
---
手贱给路由器升级到了OpenWRT 22.03，结果防火墙规则文件`/etc/firewall.user`直接没了，好家伙。一查才发现新版OpenWRT用上了Firewall 4，规则管理工具从iptables升级到了nftables，貌似天然对IPv6支持，不再需要手动安装ip6tables，嗯是个好东西，用起来。

# 背景

校园网总是能给你整点儿意想不到的烂活出来，比如给你分配一个/128的IPv6地址，又或者在DHCPv6协商阶段给你返一个错误报文。前者直接违背了IPv6的初衷，导致大多数低端路由器下的设备直接拿不到IPv6地址；后者不确定是配置问题还是华为那个核心路由器（型号好像是NE80）的bug，在客户端向服务器发送Advertise报文后直接返回一个错误报文，然后又成功返回一个地址，中间这个错误报文直接导致了MikroTik的RouterOS系统判断获取失败重启协商过程从而一直拿不到地址。

# 旧版OpenWRT的解决办法

## 防火墙

在之前的OpenWRT中，我用了一个清华大佬的贴子中的NAT办法，首先安装一堆IPv6相关的包：

```shell
opkg update
opkg install ip6tables kmod-ipt-nat6 kmod-ip6tables kmod-ip6tables-extra
```

然后在自定义防火墙文件`/etc/firewall.user`中添加自定义规则：

```shell
ip6tables -t nat -A POSTROUTING -o pppoe-wan -j MASQUERADE
ip6tables -A FORWARD -m conntrack --ctstate RELATED,ESTABLISHED -j ACCEPT
ip6tables -A FORWARD -i br-lan -j ACCEPT
```

## 路由

此外，OpenWRT从DHCP服务器拿到地址后，会自动添加一条路由：

```shell
default from 2001:xxxx:xxxx:xxxx::/64 via fe80::xxxx dev pppoe-wan metric 512
```

这条路由对路由器下的设备没有用，因此，需要在`/etc/hotplug.d/iface`文件夹下新加一条接口热插拔规则，姑且起名为`99-ipv6`（前面的数字表示执行顺序，后面的名字随便起）：

```shell
#!/bin/sh
[ "$ACTION" = ifup ] || exit 0
iface=wan6 # 这个接口名称对应/etc/config/network中定义的IPv6接口
[ -z "$iface" -o "$INTERFACE" = "$iface" ] || exit 0
ip -6 route add default via fe80::xxxx dev pppoe-wan metric 1
```

比较稳妥的办法就像上面这样，记住默认路由中的DHCP服务器地址，然后添加一条metric比较小的默认路由。

> 清华大佬用了sed替换上面那条默认路由，但我的网络中获取IPv6地址有延迟，导致一开始没有默认路由，于是就失败了。此外，第二条删除默认路的代码也有问题，语法有错。附上清华大佬的默认路由替换脚本：
> ```shell
> #!/bin/sh
> [ "$ACTION" = ifup ] || exit 0
> iface=wan6
> [ -z "$iface" -o "$INTERFACE" = "$iface" ] || exit 0
> ip -6 route add `ip -6 route show default | sed -e 's/from [^ ]* //'| sed -e 's/metric [0-9]*/metric 1/'`
> ip -6 route del `ip -6 route show default | grep from`
> ```

到这里应该内网就能上IPv6了。

# 新版OpenWRT的解决办法

## 新防火墙

新版的防火墙规则大改，研究了半天后终于搞好了。路由的热插拔脚本仍然有，但不需要装一堆IPv6的包了，只需要在`/etc/config/firewall`中添加一条NAT规则：

```conf
config nat
	option name 'IPv6 Masquerade'
	option family 'ipv6'
	option src 'wan'
	option target 'MASQUERADE'
	list proto 'all'
```

这条规则对应之前自定义防火墙规则的第一条，用于开启伪装。

另外两条我没有找到OpenWRT的uci实现的办法，只能修改`/etc/nftables.d/10-custom-filter-chains.nft`文件。这个本质上就是nftables版的`/etc/firewall.user`，只是语法有了很大变化。只需要修改一个post_forward链即可：

```conf
chain user_post_forward {
    ct state established,related accept # 对应上面第二条conntrack规则
    iifname br-lan accept # 对应上面第三条规则
}
```

至此三条自定义防火墙规则升级完成，不再需要ip6tables了。

# 其他设置

有些网络，可能需要单独设置DHCPv6相关的设置，比如路由通告（RA）等，以我的网络为例，需要修改`/etc/config/dhcp`里面lan相关的设置：

```conf
config dhcp 'lan'
	option interface 'lan'
	option start '100'
	option limit '150'
	option leasetime '12h'
	option dhcpv4 'server'
	option dhcpv6 'server'
	# 主要就是下面这三条
	option ra 'server'
	option ra_default '1'
	option ra_management '2'
```

# 后记

其实新版OpenWRT中仍然保留了对Firewall 3的兼容性，`firewall.user`规则仍然可以用，但多拨的mwan3貌似和此有冲突（只是貌似，也不确定是不是mwan3自己对Firewall 4兼容有问题），因此我先把防火墙改上来，有空再解决多拨的问题。