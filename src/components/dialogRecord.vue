<template>
  <el-dialog
    width="1100px"
    title="回调记录"
    :visible.sync="isVisible"
    custom-class="dialogRecord"
    @close="onClose"
    @open="onOpen"
    :close-on-click-modal="false"
  >
    <div class="wrap">
      <div class="operation">
        <el-button type="primary" size="mini" @click="onDeliveryAll"
          >一键发货</el-button
        >
      </div>
      <el-table :data="list" align="center" v-loading="loading">
        <!-- <el-table-column prop="date" label="图片" width="80">
          <template slot-scope="scope">
            <img style="width: 50px; height: 50px" :src="scope.row.tumPath" />
          </template>
        </el-table-column> -->
        <el-table-column prop="orderId" label="订单号" width="200">
        </el-table-column>
        <el-table-column prop="logistics" label="快递公司">
          <template slot-scope="scope">
            <span>{{ scope.row.logistics }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="logisticsNumber"
          label="快递单号"
          width="180"
        ></el-table-column>
        <el-table-column prop="status" label="状态">
          <template slot-scope="scope">
            <el-tag type="success" v-if="scope.row.status === 1">{{
              scope.row.status | formatStatus
            }}</el-tag>
            <el-tag type="warning" v-else-if="scope.row.status === 3">{{
              scope.row.status | formatStatus
            }}</el-tag>
            <el-tag v-else>{{ scope.row.status | formatStatus }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="modifyTime" label="更新时间" width="180">
        </el-table-column>
        <el-table-column prop="" label="操作" width="180">
          <template slot-scope="scope">
            <el-button
              v-if="scope.row.status === 1"
              type="primary"
              size="mini"
              @click="onDelivery(scope.row)"
              :loading="sendLoading"
              >发货</el-button
            >
            <el-button
              type="warning"
              size="mini"
              v-if="scope.row.status === 3"
              @click="onDelivery(scope.row)"
              :loading="sendLoading"
              >重试</el-button
            >
            <el-button
              type="danger"
              size="mini"
              @click="onChangeStatus(scope.row.id, 4)"
              >忽略</el-button
            >
          </template>
        </el-table-column>
      </el-table>
      <el-pagination
        style="margin-top:10px"
        layout="total, prev, pager, next"
        @current-change="onChangePage"
        :current-page="pageNo"
        :page-size="50"
        :total="total"
      ></el-pagination>
    </div>
  </el-dialog>
</template>
<script>
export default {
  props: {
    visible: {
      type: Boolean,
      required: true,
    },
    logistics: {
      type: Array || null,
      require: true,
    },
    pddLogistics: {
      type: Array || null,
      require: true,
    },
    userInfo: {
      type: Object || null,
      require: true,
    },
  },
  data: function() {
    return {
      pageNo: 1,
      total: 0,
      list: [],
      loading: false,
      sendLoading: false,
    };
  },
  filters: {
    formatStatus(value) {
      switch (value) {
        case 0:
          return "等待回调";
        case 1:
          return "等待发货";
        case 2:
          return "发货成功";
        case 3:
          return "发货失败";
        case 4:
          return "忽略";
        default:
          return "-";
      }
    },
  },
  computed: {
    isVisible: {
      get() {
        return this.visible;
      },
      set(val) {
        if (!val) {
          this.$emit("update:visible", false);
        }
      },
    },
  },
  methods: {
    getRecordList() {
      this.loading = true;
      const params = {
        pageNo: this.pageNo,
      };
      $.ajax({
        url: `https://${this.$root.env}.prprp.com/api/callbackRecord/page`,
        type: "GET",
        headers: {
          token: this.$root.token,
        },
        data: params,
      })
        .then(({ data: { records, total }, status, msg }) => {
          if (status === 200) {
            this.list = records;
            this.total = Number(total);
          } else {
            this.$message.error(msg);
          }
          this.loading = false;
        })
        .catch((error) => {
          this.loading = false;
          const { responseJSON = {} } = error || {};
          const { msg = "" } = responseJSON || {};
          this.$message.error(msg);
        });
    },
    // 发货
    onDelivery(listData) {
      if (!this.userInfo.defaultShopId) {
        this.$message.error("获取店铺信息失败，请稍后再试");
        return;
      }
      if (this.pddLogistics.length === 0) {
        this.$message.error("获取追风兔快递列表失败，请稍后再试");
        return;
      }
      this.sendLoading = true;
      const { defaultShopId = null } = this.userInfo || {};
      const {
        orderId = "",
        logisticsNumber = "",
        id: listId = "",
        logistics: cpCode = "",
      } = listData || {};
      const { id = "" } = this.pddLogistics.find(
        (item) => item.code === cpCode
      );
      const data = {
        apiMethodName: "pdd.logistics.online.send",
        shopId: defaultShopId,
        textParams: {
          logistics_id: id,
          order_sn: orderId,
          redelivery_type: 1,
          refund_address_id: this.$root.refundAddressId,
          tracking_number: logisticsNumber,
        },
      };
      $.ajax({
        url: "//ctdd.topchitu.com/api/pdd",
        type: "POST",
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        data: JSON.stringify(data),
      })
        .then(() => {
          this.onChangeStatus(listId, 2);
        })
        .catch((error) => {
          this.onChangeStatus(listId, 3);
          const { responseJSON = {} } = error || {};
          const { sub_msg = "" } = responseJSON || {};
          this.sendLoading = false;
          this.$message.error(sub_msg);
        });
    },
    // 一键发货
    async onDeliveryAll() {
      if (!this.userInfo.defaultShopId) {
        this.$message.error("获取店铺信息失败，请稍后再试");
        return;
      }
      if (this.pddLogistics.length === 0) {
        this.$message.error("获取追风兔快递列表失败，请稍后再试");
        return;
      }
      this.sendLoading = true;
      const { defaultShopId = null } = this.userInfo || {};
      const list = this.list.filter((item) => {
        return item.status === 1;
      });
      const resList = [];
      for (let index in list) {
        const {
          orderId = "",
          logisticsNumber = "",
          id: listId = "",
          logistics: cpCode = "",
        } = list[index] || {};
        const { id = "" } = this.pddLogistics.find(
          (item) => item.code === cpCode
        );
        const data = {
          apiMethodName: "pdd.logistics.online.send",
          shopId: defaultShopId,
          textParams: {
            logistics_id: id,
            order_sn: orderId,
            redelivery_type: 1,
            refund_address_id: this.$root.refundAddressId,
            tracking_number: logisticsNumber,
          },
        };
        await $.ajax({
          url: "//ctdd.topchitu.com/api/pdd",
          type: "POST",
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          data: JSON.stringify(data),
        })
          .then(() => {
            resList.push({
              id: listId,
              status: 2,
            });
          })
          .catch((error) => {
            resList.push({
              id: listId,
              status: 3,
            });
            const { responseJSON = {} } = error || {};
            const { sub_msg = "" } = responseJSON || {};
            this.$message.error(sub_msg);
          });
      }
      this.onChangeStatusAll(resList);
    },
    onChangeStatus(id, status) {
      const params = [
        {
          id,
          status,
        },
      ];
      $.ajax({
        url: `https://${this.$root.env}.prprp.com/api/callbackRecord/updateStatus`,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        headers: {
          token: this.$root.token,
        },
        data: JSON.stringify(params),
      })
        .then((response) => {
          const { status: code = null } = response || {};
          if (code === 200) {
            if (status === 4) {
              this.$message.success("操作成功");
            } else {
              this.$message.success("发货成功");
            }
            this.getRecordList();
          } else {
            this.$message.error("修改回调失败");
          }
          this.sendLoading = false;
        })
        .catch((error) => {
          this.sendLoading = false;
          const { responseJSON = {} } = error || {};
          const { msg = "" } = responseJSON || {};
          this.$message.error(msg);
        });
    },
    onChangeStatusAll(list) {
      $.ajax({
        url: `https://${this.$root.env}.prprp.com/api/callbackRecord/updateStatus`,
        type: "POST",
        contentType: "application/json; charset=utf-8",
        headers: {
          token: this.$root.token,
        },
        data: JSON.stringify(list),
      })
        .then((response) => {
          const { status: code = null } = response || {};
          if (code === 200) {
            this.$message.success("操作成功");
            this.getRecordList();
          } else {
            this.$message.error("修改回调失败");
          }
          this.sendLoading = false;
        })
        .catch((error) => {
          this.sendLoading = false;
          const { responseJSON = {} } = error || {};
          const { msg = "" } = responseJSON || {};
          this.$message.error(msg);
        });
    },
    onClose() {
      this.pageNo = 1;
      this.total = 0;
      this.list = [];
      this.isVisible = false;
      this.sendLoading = false;
    },
    onOpen() {
      this.getRecordList();
    },
    onChangePage(page) {
      this.pageNo = page;
      this.getRecordList();
    },
  },
  mounted() {},
};
</script>
<style lang="less" scoped>
.dialogRecord {
  .wrap {
    width: 100%;
    .operation {
      display: flex;
      justify-content: flex-end;
      align-content: center;
    }
  }
}
</style>
